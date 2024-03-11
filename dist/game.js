"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
class Game {
    constructor(server, code) {
        this.io = server;
        this.code = code;
        this.running = false;
        this.players = new Map();
        this.state = "init";
        this.fPlayers = [];
        this.cRounds = [];
        this.cR = 0;
        return this;
    }
    submitPlayer(socket, p) {
        this.getPlayerBySocket(socket).fplayer = p;
        let status = [];
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
    calculateRounds() {
        let rounds = this.players.size;
        for (let i = 0; i < rounds; i++) {
            let values = [...this.getAllPlayers().values()];
            let imposter;
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
    execRound() {
        let imposter_name = this.cRounds[this.cR].imposter.name;
        this.cRounds[this.cR].imposter.socket.emit("packet", {
            cmd: "round",
            data: {
                name: "imposter",
            },
        });
        this.players.forEach((p, name, _map) => {
            if (name == imposter_name)
                return;
            console.log(this.fPlayers[this.cR]);
            p.socket.emit("packet", {
                cmd: "round",
                data: this.fPlayers[this.cR],
            });
        });
    }
    nextRound() {
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
        }
        else {
            this.cR++;
            this.execRound();
        }
    }
    addPlayer(name, socket, owner) {
        let player = {
            name: name,
            socket: socket,
            owner: owner,
            fplayer: null,
        };
        this.players.set(name, player);
    }
    getPlayerByName(name) {
        return this.players.get(name);
    }
    getPlayerBySocket(socket) {
        let p = undefined;
        this.players.forEach((value, key, _map) => {
            if (socket === value.socket) {
                p = value;
            }
        });
        return p;
    }
    removePlayerByName(name) {
        this.players.delete(name);
    }
    getAllPlayers() {
        return this.players;
    }
    getRunning() {
        return this.running;
    }
    setRunning(b) {
        this.running = b;
        this.broadcast({ cmd: "running", data: b });
        this.setState("picking");
    }
    getState() {
        return this.state;
    }
    setState(s) {
        this.state = s;
        this.broadcast({ cmd: "state", data: s });
        if (s == "disc") {
            this.execRound();
        }
    }
    broadcast(msg) {
        console.log(msg);
        this.io.to(this.code).emit("packet", msg);
    }
}
exports.Game = Game;
