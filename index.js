"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const gameserver_1 = require("./gameserver");
class Server {
    constructor() {
        this.initial();
        this.listen();
        this.game = new gameserver_1.GameServer(this.server);
    }
    initial() {
        this.server = http_1.createServer();
        this.port = Server.PORT;
    }
    listen() {
        this.server.listen(this.port, () => {
            console.log("Running server on port %s", this.port);
        });
    }
}
Server.PORT = 3001;
new Server();
