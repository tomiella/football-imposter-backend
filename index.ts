import { createServer, Server as HServer } from "http";
import { GameServer } from "./gameserver";

class Server {
  public static readonly PORT: number = 3001;
  private server: HServer;
  private port: number;
  private game: GameServer;

  public constructor() {
    this.initial();
    this.listen();
    this.game = new GameServer(this.server);
  }

  private initial() {
    this.server = createServer();
    this.port = Server.PORT;
  }

  private listen(): void {
    this.server.listen(this.port, () => {
      console.log("Running server on port %s", this.port);
    });
  }
}

new Server();
