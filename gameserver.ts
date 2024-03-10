import { Server } from "http";
import * as socketio from "socket.io";
import * as events from "events";
import { Game } from "./game";

export class GameServer {
  private io: socketio.Server;
  private ev: events;
  private games: Map<string, Game>;

  public constructor(server: Server) {
    this.io = new socketio.Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.games = new Map<string, Game>();
    this.listen();
    this.ev = new events.EventEmitter();

    return this;
  }

  private listen(): void {
    this.io.on("connect", (socket: socketio.Socket) => {
      let _this = this;
      let gameCode = "";

      socket.on("join", (data) => {
        if (this.io.sockets.adapter.rooms.has(data.code)) {
          socket.join(data.code);
          this.games.get(data.code)?.addPlayer(data.name, socket, false);
          gameCode = data.code;
          socket.emit("join-success");
        } else {
          socket.emit("err", "game-not-found");
        }
      });

      socket.on("create", (name) => {
        let code: string;
        do {
          code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (this.io.sockets.adapter.rooms.get(code)?.size);

        socket.join(code);
        let game = new Game(this.io, code);
        game.addPlayer(name, socket, true);
        this.games.set(code, game);
        gameCode = code;
        socket.emit("create-success", code);
      });

      socket.on("check", (code) => {
        if (!socket.rooms.has(code)) {
          socket.emit("err", "not-part-of-game");
        } else {
          let msg =
            this.io.sockets.adapter.rooms.get(code)?.size.toString() + " | ";
          this.games
            .get(code)
            ?.getAllPlayers()
            .forEach((_value, key, _map) => {
              msg += key + " ";
            });
          this.io.to(code).emit("size", msg);
        }
      });

      socket.on("packet", (data) => {
        _this.onPacket(socket, gameCode, data);
      });

      socket.on("disconnecting", () => {
        socket.rooms.forEach((__, key, _) => {
          if (key.length == 4) {
            let p = this.games.get(key)?.getPlayerBySocket(socket);
            this.games.get(key)?.removePlayerByName(p!.name);

            let size: number = this.io.sockets.adapter.rooms.get(key)?.size!;
            size = size - 1;
            let msg = size + " | ";
            this.games
              .get(key)
              ?.getAllPlayers()
              .forEach((_value, key, _map) => {
                msg += key + " ";
              });
            this.io.to(key).emit("size", msg);

            if (size == 0) {
              this.games.delete(key);
            }
          }
        });
      });

      socket.on("disconnect", this.onDisconnect);
    });
  }

  private onPacket(socket: any, code: string, data: any) {
    console.log(data.cmd);
    switch (data.cmd) {
      case "changeGameRunning":
        this.games.get(code)!.setRunning(data.data);
        break;

      case "submit-player":
        if (this.games.get(code)!.getState() != "picking") break;

        this.games.get(code)!.submitPlayer(socket, data.data);
        break;

      case "disc-stop":
        this.games.get(code)!.nextRound();
        break;
    }
    //socket.broadcast.to(code).emit("message", data);
  }

  private onDisconnect(m: any) {
    console.log("TCL: SocketIO -> privateonDisconnect -> m", m);
  }
}
