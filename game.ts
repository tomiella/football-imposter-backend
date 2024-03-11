import * as socketio from "socket.io";

interface Player {
  name: string;
  socket: socketio.Socket;
  owner: boolean;
  fplayer: any;
}

interface FPlayer {
  name: string;
  p: string;
}

export class Game {
  private io: socketio.Server;
  private players: Map<string, Player>;
  private code: string;
  private running: boolean;
  private state: string;
  private fPlayers: any[];
  private cRounds: any[];
  private cR: number;

  public constructor(server: socketio.Server, code: string) {
    this.io = server;
    this.code = code;
    this.running = false;
    this.players = new Map<string, Player>();
    this.state = "init";
    this.fPlayers = [];
    this.cRounds = [];
    this.cR = 0;

    return this;
  }

  public submitPlayer(socket: socketio.Socket, p: any): void {
    this.getPlayerBySocket(socket)!.fplayer = p;
    let status: string[] = [];
    this.getAllPlayers().forEach((p, name, _map) => {
      if (p.fplayer != null) {
        status.push(name);
      }
    });
    this.fPlayers.push(p);

    this.broadcast({
      cmd: "picking-status",
      data: status,
    });

    if (status.length == this.players.size) {
      this.calculateRounds();
      this.setState("disc");
    }
  }

  private calculateRounds() {
    let rounds = this.players.size;
    for (let i = 0; i < rounds; i++) {
      let values = [...this.getAllPlayers().values()];
      let imposter: Player;

      do {
        imposter = values[~~(Math.random() * values.length)];
      } while (imposter.fplayer.name == this.fPlayers[i].name);

      let round = {
        imposter: imposter,
        fplayer: this.fPlayers[i],
      };
      this.cRounds.push(round);
    }
  }

  private execRound() {
    let imposter_name = this.cRounds[this.cR].imposter.name;
    this.cRounds[this.cR].imposter.socket.emit("packet", {
      cmd: "round",
      data: {
        name: "imposter",
      },
    });

    this.players.forEach((p, name, _map) => {
      if (name == imposter_name) return;
      console.log(this.fPlayers[this.cR]);
      p.socket.emit("packet", {
        cmd: "round",
        data: this.fPlayers[this.cR],
      });
    });
  }

  public nextRound() {
    if (this.cR == this.players.size - 1) {
      this.fPlayers = [];
      this.cR = 0;
      this.cRounds = [];
      this.getAllPlayers().forEach((p, name, _map) => {
        p.fplayer = null;
      });
      this.setState("picking");
      this.io.to(this.code).emit("reset-picking");
      this.broadcast({
        cmd: "picking-status",
        data: [],
      });
    } else {
      this.cR++;
      this.execRound();
    }
  }

  public addPlayer(name: string, socket: socketio.Socket, owner: boolean) {
    let player: Player = {
      name: name,
      socket: socket,
      owner: owner,
      fplayer: null,
    };

    this.players.set(name, player);
  }

  public getPlayerByName(name: string): Player | undefined {
    return this.players.get(name);
  }

  public getPlayerBySocket(socket: socketio.Socket): Player | undefined {
    let p: Player | undefined = undefined;
    this.players.forEach((value, key, _map) => {
      if (socket === value.socket) {
        p = value;
      }
    });
    return p;
  }

  public removePlayerByName(name: string): void {
    this.players.delete(name);
  }

  public getAllPlayers(): Map<string, Player> {
    return this.players;
  }

  public getRunning(): boolean {
    return this.running;
  }

  public setRunning(b: boolean): void {
    this.running = b;
    this.broadcast({ cmd: "running", data: b });
    this.setState("picking");
  }

  public getState(): string {
    return this.state;
  }

  public setState(s: string): void {
    this.state = s;
    this.broadcast({ cmd: "state", data: s });
    if (s == "disc") {
      this.execRound();
    }
  }

  private broadcast(msg: any) {
    console.log(msg);
    this.io.to(this.code).emit("packet", msg);
  }
}
