"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameServer = void 0;
const socketio = __importStar(require("socket.io"));
const events = __importStar(require("events"));
const game_1 = require("./game");
class GameServer {
    constructor(server) {
        this.io = new socketio.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        this.games = new Map();
        this.listen();
        this.ev = new events.EventEmitter();
        return this;
    }
    listen() {
        this.io.on("connect", (socket) => {
            let _this = this;
            let gameCode = "";
            socket.on("join", (data) => {
                var _a, _b;
                if (this.io.sockets.adapter.rooms.has(data.code)) {
                    socket.join(data.code);
                    (_a = this.games.get(data.code)) === null || _a === void 0 ? void 0 : _a.addPlayer(data.name, socket, false);
                    if (((_b = this.games.get(data.code)) === null || _b === void 0 ? void 0 : _b.getRunning()) == true) {
                        socket.emit("err", "game-already-started");
                    }
                    else {
                        gameCode = data.code;
                        socket.emit("join-success");
                    }
                }
                else {
                    socket.emit("err", "game-not-found");
                }
            });
            socket.on("create", (name) => {
                var _a;
                let code;
                do {
                    code = Math.floor(1000 + Math.random() * 9000).toString();
                } while ((_a = this.io.sockets.adapter.rooms.get(code)) === null || _a === void 0 ? void 0 : _a.size);
                socket.join(code);
                let game = new game_1.Game(this.io, code);
                game.addPlayer(name, socket, true);
                this.games.set(code, game);
                gameCode = code;
                socket.emit("create-success", code);
            });
            socket.on("check", (code) => {
                var _a, _b, _c, _d;
                if (!socket.rooms.has(code)) {
                    socket.emit("err", "not-part-of-game");
                }
                else {
                    let msg = ((_a = this.io.sockets.adapter.rooms.get(code)) === null || _a === void 0 ? void 0 : _a.size.toString()) + " | ";
                    (_b = this.games
                        .get(code)) === null || _b === void 0 ? void 0 : _b.getAllPlayers().forEach((_value, key, _map) => {
                        msg += key + " ";
                    });
                    this.io.to(code).emit("size", msg);
                    socket.emit("owner", (_d = (_c = this.games.get(code)) === null || _c === void 0 ? void 0 : _c.getPlayerBySocket(socket)) === null || _d === void 0 ? void 0 : _d.owner);
                }
            });
            socket.on("packet", (data) => {
                _this.onPacket(socket, gameCode, data);
            });
            socket.on("disconnecting", () => {
                socket.rooms.forEach((__, key, _) => {
                    var _a, _b, _c, _d;
                    if (key.length == 4) {
                        let p = (_a = this.games.get(key)) === null || _a === void 0 ? void 0 : _a.getPlayerBySocket(socket);
                        (_b = this.games.get(key)) === null || _b === void 0 ? void 0 : _b.removePlayerByName(p.name);
                        let size = (_c = this.io.sockets.adapter.rooms.get(key)) === null || _c === void 0 ? void 0 : _c.size;
                        size = size - 1;
                        let msg = size + " | ";
                        (_d = this.games
                            .get(key)) === null || _d === void 0 ? void 0 : _d.getAllPlayers().forEach((_value, key, _map) => {
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
    onPacket(socket, code, data) {
        var _a;
        console.log(data);
        switch (data.cmd) {
            case "changeGameRunning":
                this.games.get(code).setRunning(data.data);
                break;
            case "submit-player":
                if (((_a = this.games.get(code)) === null || _a === void 0 ? void 0 : _a.getState()) != "picking")
                    break;
                this.games.get(code).submitPlayer(socket, data.data);
                break;
            case "disc-stop":
                this.games.get(code).nextRound();
                break;
        }
        //socket.broadcast.to(code).emit("message", data);
    }
    onDisconnect(m) {
        console.log("TCL: SocketIO -> privateonDisconnect -> m", m);
    }
}
exports.GameServer = GameServer;
