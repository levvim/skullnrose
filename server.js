//const http = require("http").Server(app);
//
//var express = require('express');
//var app = express();
//var server = app.listen(8810);
//var io = require('socket.io').listen(server);
//var Moniker = require('moniker');
//
//const port = process.env.PORT || 8080;
//var path = require('path')
//
//app.get("/", function(req, res) {
//    res.sendFile(__dirname + "/index.html");
//});

const express = require('express');
const path = require('path');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var Moniker = require('moniker');
var async = require("async");

let rooms = 0;

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

var users = [];
var usersRoom=[];
var p=0;

// control user connect/disconnect and initiate user params
var addUser = function(name, room, socketid) {
    var user = {
        name: name,
        p: 0,
        skull: 1,
        rose: 3,
        boardRose: 0,
        boardSkull: 0,
        stack: [],
        bid: 0,
        pass: 0,
        win: 0,
        room: room,
        socketid: socketid
    }
    j=0
    for(var i=0; i<users.length; i++) {
        if(user.name === users[i].name) {
            users[i]['socketid'] = socketid
        } else {
        j++
        }
    }
    if(j===users.length){
        users.push(user);
    }
    updateUsers(user.room);
    io.to(user['socketid']).emit("prompt", { message: "welcome, " + user['name']   });
    return user;
}

var removeUser = function(user) {
    for(var i=0; i<users.length; i++) {
        if(user.name === users[i].name) {
            users.splice(i, 1);
            updateUsers(user.room);
            return;
        }
    }
}

// allow for copying of objects instead of reference
// useful for different game states
function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

var updateUsers = function(room) {
    var str = '';
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']===room){
           var user = users[i];
           str += user.name + ' <small>(' + user.win + ' w)</small> ';
        }
    }
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']===room){
            console.log("emitting new user list to " + users[i]['socketid'])
            io.to(users[i]['socketid']).emit("users", { users: str });
        }
    }
}

var getRoomLength = function(room) {
    var j=0
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']===room){
            j = j+1
        }
    }
    return j
}

var getUsersRoom = function(room) {
    var usersRoomTemp=[]
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']==room){
            if(users[i]['rose'] + users[i]['skull'] != 0){
                usersRoomTemp.push(users[i])
            }
        }
    }
    return usersRoomTemp
}

var getUser = function(room, p) {
    console.log("retrieving player " + p + " from room " + room)
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']==room){
            if(users[i]['p']==p){
                return users[i]
            }
        }
    }
}

var pushStack = function(room, p, disc) {
    console.log("pushing " + disc + " to " + p + " from room " + room)
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']==room){
            if(users[i]['p']==p){
                users[i]['stack'].push(disc)
            }
        }
    }
}

//game functions
function randomStartPlayer(num) {
    const randomNumber = Math.floor(Math.random() * num);
    return randomNumber;
}

function nextPlayer(room, p) {
    var usersRoomTemp=[]
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']==room){
            if(users[i]['rose'] + users[i]['skull'] != 0){
                usersRoomTemp.push(users[i])
            }
        }
    }
    var currentP
    for(var i=0; i<usersRoomTemp.length; i++) {
        if(usersRoomTemp[i]['p']==p){
            currentP=i
        }
    }
    if(currentP==usersRoomTemp.length-1) {
            console.log('nextPlayer is floored to 0' )
            return usersRoomTemp[0]['p']
    } else {
            currentP=currentP + 1
            console.log('nextPlayer is ' + currentP)
            return usersRoomTemp[currentP]['p']
    }
}

function nextPlayerBid(room, p) {
    var usersRoomTemp=[]
    //retrieve users that didnt pass yet
    for(var i=0; i<users.length; i++) {
        if(users[i]['room']==room){
            if(users[i]['pass']==0){
                if(users[i]['rose'] + users[i]['skull'] != 0){
                    usersRoomTemp.push(users[i])
                }
            }
        }
    }
    console.log('nextplayerbid num ' + p + ' dict ' + usersRoomTemp.length)
    //retrieve indice of p
    var currentP
    for(var i=0; i<usersRoomTemp.length; i++) {
        if(usersRoomTemp[i]['p']==p){
            currentP=i
        }
    }
    if(usersRoomTemp.length==1) {
        return false
    }
    if(currentP==usersRoomTemp.length-1) {
            console.log('nextPlayerBid is floored to 0' )
            return usersRoomTemp[0]['p']
    } else {
            currentP=currentP + 1
            console.log('nextPlayerBid is ' + currentP)
            return usersRoomTemp[currentP]['p']
    }
}

async function sleep(num) {
        await sleep(num);
}

function resetBoardState(dict) {
    var i;
    for (i = 0; i < dict.length; i++) {
        dict[i]['boardRose'] = 0
        dict[i]['boardSkull'] = 0
        dict[i]['stack'] = []
        dict[i]['bid'] = 0
        dict[i]['pass'] = 0
    }
    return dict
}

function resetGameState(dict) {
    var i;
    for (i = 0; i < dict.length; i++) {
        dict[i]['rose'] = 3
        dict[i]['skull'] = 1
        dict[i]['stack'] = []
        dict[i]['bid'] = 0
        dict[i]['pass'] = 0
        dict[i]['win'] = 0
    }
    return dict
}

function getMaxBid(dict) {
    var i;
    maxBid = 0
    for (i = 0; i < dict.length; i++) {
        maxBid = maxBid + dict[i]['boardRose']
        maxBid = maxBid + dict[i]['boardSkull']
    }
    return maxBid
}

function getChallenger(dict) {
    var i;
    challenger = dict[0]
    for (i = 0; i < dict.length; i++) {
        if(dict[i]['pass'] == 0) {
            if(dict[i]['bid'] > challenger['bid'] ) {
                    console.log('well ' + dict[i]['bid'] + " is bigger than " + challenger['bid'] )
                    challenger = dict[i]
                    console.log('getChallenger will now return ')
                    console.log(challenger)
            }
        }
    }
    return challenger
}

function getUsersPass(dict) {
    var i;
    numPass = 0
    for (i = 0; i < dict.length; i++) {
        numPass = maxBid + dict[i]['pass']
    }
    if(numPass >= dict.length - 1) {
        return 1;
    } else {
        return 0;
    }
}

function removeDisc(dict) {
    userStackTemp=[]
    console.log("removing random disc for " + dict['name'])
    for (i = 0; i < dict['skull']; i++) {
        userStackTemp.push('s')
    }
    for (i = 0; i < dict['rose']; i++) {
        userStackTemp.push('r')
    }
    const randomNumber = Math.floor(Math.random() * userStackTemp.length);
    if(userStackTemp[randomNumber] == 'r') {
        console.log('user lost a rose')
        dict['rose'] = dict['rose'] - 1
        console.log(dict)
    }
    if(userStackTemp[randomNumber] == 's') {
        console.log('user lost a skull')
        dict['rose'] = dict['rose'] - 1
        console.log(dict)
    }
}


async function playerSkull(socket, user) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    console.log('recieved skull' )
    if(currentUser['boardSkull'] < currentUser['skull'] ) {
        currentUser['boardSkull'] = currentUser['boardSkull'] + 1
        pushStack(user.room, user.p, 'skull')
        console.log(currentUser)
        for (i = 0; i < usersRoom.length; i++) {
            console.log('sending prompt to ' + usersRoom[i]['socketid']  )
            await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " put down a disc." });
            await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " put down a disc." });
            await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:currentUser['p'], message:currentUser['stack'].length  });
        }
        p = nextPlayer(user.room, user.p)
        return serverTurn(socket, users, user.room, p)
    } else {
         console.log('sending playerTurn err to p= ' + p)
         io.to(currentUser['socketid']).emit("playerTurn", { message: "you have no more skulls. make another selection"  });
    }
}

async function playerRose(socket, user) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    console.log('recieved rose ' )
    if(currentUser['boardRose'] < currentUser['rose'] ) {
        currentUser['boardRose'] = currentUser['boardRose'] + 1
        pushStack(user.room, user.p, 'rose')
        console.log(currentUser)
        for (i = 0; i < usersRoom.length; i++) {
            console.log('sending prompt to ' + usersRoom[i]['socketid']  )
            await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " put down a disc." });
            await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " put down a disc." });
            await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:currentUser['p'], message:currentUser['stack'].length  });
        }
        p = nextPlayer(user.room, user.p)
        return serverTurn(socket, users, user.room, p)
    } else {
         console.log('sending playerTurn err to p= ' + p)
         io.to(currentUser['socketid']).emit("playerTurn", { message: "you have no more roses. make another selection"  });
    }
}

async function playerBid(socket, user) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    console.log('recieved playerBid from' )
    console.log(currentUser)
    console.log('maxBid is ' )
    console.log(getMaxBid(usersRoom))

    //check if there is at least 1 disc per mat
    var count=0
    for(var i=0; i<usersRoom.length; i++) {
        count = count + parseInt(usersRoom[i]['boardSkull'])
        count = count + parseInt(usersRoom[i]['boardRose'] )
    }
    console.log('there are currently ' + count + ' mats out')
    if(count < usersRoom.length) {
         io.to(currentUser['socketid']).emit("playerTurn", { message: "each player must put down a disc to start." });
    } else {
        io.to(currentUser['socketid']).emit("playerTurnBidInitial", { message: "propose a bid (max " + getMaxBid(usersRoom) + ")."});
    }
}

async function playerBidInc(socket, user, bid) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    currentChallenger=getChallenger(usersRoom)

    console.log('maxBid is ' )
    console.log(getMaxBid(usersRoom))
    console.log('currentUser bid is ' )
    console.log(bid)
    console.log('currentChallenger bid is ' )
    console.log(currentChallenger['bid'])

    if(bid <= currentChallenger['bid']) {
         console.log('sending bid err to p= ' + p)
         io.to(currentUser['socketid']).emit("playerTurnBid", { message: "bid is too small. make another selection (max " + getMaxBid(usersRoom) + ")." });
    } else if (bid > getMaxBid(usersRoom)) {
         console.log('sending bid err to p= ' + p)
         io.to(currentUser['socketid']).emit("playerTurnBid", { message: "bid is too large. make another selection (max " + getMaxBid(usersRoom) + ")." });
    } else {
        currentUser['bid'] = bid
        currentChallenger=getChallenger(usersRoom)
        for (i = 0; i < usersRoom.length; i++) {
            console.log('sending prompt to ' + usersRoom[i]['socketid']  )
            await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " put down a bid of " + bid + "." });
            await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " put down a bid of " + bid + "." });
        }
        //updateChallengers, nextPlayerChallengers
        if(bid==getMaxBid(usersRoom)){
            return serverTurnSelection(socket, users, user.room, p)
        } else {
            p = nextPlayerBid(user.room, user.p)
            return serverTurnBid(socket, users, user.room, p)
        }
    }
}

async function playerBidPass(socket, user) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    currentChallenger=getChallenger(usersRoom)

    for (i = 0; i < usersRoom.length; i++) {
        console.log('sending prompt to ' + usersRoom[i]['socketid']  )
        await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " passed." });
        await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " passed." });
    }

    p = nextPlayerBid(user.room, user.p)
    currentUser['pass'] = 1

    //updateChallengers, nextPlayerChallengers
    if(p==false){
        p=currentChallenger['p']
        return serverTurnSelection(socket, users, user.room, p)
    } else {
        return serverTurnBid(socket, users, user.room, p)
    }
}

async function playerSelection(socket, user, mat) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    currentChallenger=getChallenger(usersRoom)

    console.log('currentChallenger is ' )
    console.log(currentChallenger)

    if(currentChallenger['stack'].length != 0 && currentChallenger['p'] != mat) {
        io.to(currentUser['socketid']).emit("playerTurnSelection", { message: "you must clear your mats out first." });
    } else if(usersRoom[mat]['stack'].length == 0 ) {
        io.to(currentUser['socketid']).emit("playerTurnSelection", { message: "you must choose a non-empty mat." });
    } else {
        console.log('correct mat of choice ' + mat)
        matResult=usersRoom[mat]['stack'][usersRoom[mat]['stack'].length-1]
        console.log('mat result is ' + matResult)

        usersRoom[mat]['stack'].pop()

        if(matResult == 'rose') {
            currentUser['bid'] = currentUser['bid'] - 1

            for (i = 0; i < usersRoom.length; i++) {
                console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a rose. " + usersRoom[p]['name'] + " has " + usersRoom[p]['bid'] + " to go." });
                await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a rose. " + usersRoom[p]['name'] + " has " + usersRoom[p]['bid'] + " to go." });
                await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:mat, message:usersRoom[mat]['stack'].length  });
            }
            console.log(currentUser['name'] + "'s bid is now " + currentUser['bid'])
            if(currentUser['bid'] == 0){
                currentUser['win'] = currentUser['win'] + 1
                updateUsers(user.room)
                for (i = 0; i < usersRoom.length; i++) {
                    console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                    await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " won the round!" });
                    await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " won the round!" });
                    await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:mat, message:usersRoom[mat]['stack'].length  });
                }
                if(currentUser['win'] == 2){
                    for (i = 0; i < usersRoom.length; i++) {
                        console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                        await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " won the game!" });
                        await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " won the game!" });
                    }
                } else {
                    return serverRound(socket, users, user.room, p)
                }

            } else {
                return serverTurnSelection(socket, users, user.room, p)
            }

        }
        if(matResult == 'skull') {
            removeDisc(currentUser)
            updateUsers(user.room)
            for (i = 0; i < usersRoom.length; i++) {
                console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a skull" });
                await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a skull" });
                await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " lost the round!" });
                await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " lost the round!" });
                await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:currentUser['p'], message:currentUser['stack'].length  });
            }
            if(currentUser['rose'] + currentUser['skull'] == 0) {
                for (i = 0; i < usersRoom.length; i++) {
                    console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                    await io.to(usersRoom[i]['socketid']).emit("prompt", { message: currentUser['name'] + " is out of discs and is knocked out from the game." });
                    await io.to(usersRoom[i]['socketid']).emit("log", { message: currentUser['name'] + " is out of discs and is knocked out from the game." });
                    return serverRound(socket, users, user.room, p)
                }
            } else {
                await io.to(currentUser['socketid']).emit("log", { message:  "you have " + currentUser['skull'] + " skulls and " + currentUser['rose'] + " roses left."});
                return serverRound(socket, users, user.room, p)
            }
        }
    }
}

async function serverTurn(socket, users, room,  p) {
    console.log('starting new turn p=' + p)
    usersRoom=getUsersRoom(room)
    // player turn
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    console.log('sending playerTurn to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
    await io.to(usersRoom[p]['socketid']).emit("playerTurn", { message: "make your move."  });
}

async function serverTurnBid(socket, users, room,  p) {
    console.log('starting new bid turn p=' + p)
    usersRoom=getUsersRoom(room)
        // if bid turn () is complete then pass to serverturnselection fn
    // player turn
        // TODO emit turn logs to only players in room w loop
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    console.log('sending playerTurnBid to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
    await io.to(usersRoom[p]['socketid']).emit("playerTurnBid", { message: "make your move "  });
}

async function serverTurnSelection(socket, users, room,  p) {
    console.log('starting new selection turn p=' + p)
    usersRoom=getUsersRoom(room)
    console.log('sending playerTurnSelection to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    await io.to(usersRoom[p]['socketid']).emit("playerTurnSelection", { message: "choose a mat. "  });
}

async function serverRound(socket, users, room, p) {
    console.log('starting new round')
    usersRoom=getUsersRoom(room)
    // turn setup
    // reset game state
        // TODO reset for only players in room w loop

    await resetBoardState(usersRoom)
    io.sockets.emit("resetBoardMats")
    io.sockets.emit("resetBoard")

    return serverTurn(socket, users, room, p)
}

//game()
async function game(socket, users, room) {
    console.log('starting new game')
    usersRoom=getUsersRoom(room)

    await resetGameState(usersRoom)

    //say hello + assign players
    for (i = 0; i < usersRoom.length; i++) {
        usersRoom[i]['p'] = i
        io.to(usersRoom[i]['socketid']).emit("assignPlayer", { p: usersRoom[i]['p'] });
        io.to(usersRoom[i]['socketid']).emit("log", { message: "welcome to a new game " + usersRoom[i]['name'] + ". you are player " + usersRoom[i]['p'] + "." });
    }

    p=randomStartPlayer(usersRoom.length) //starting player

    console.log('game start player is p=' + p)

    return serverRound(socket, users, room, p)
}

//main()
io.sockets.on('connection', function (socket) {


    //socket.on('disconnect', function () {
    //    removeUser(user);
    //});

    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        roomID=`room-${++rooms}`
        socket.join(roomID);
        user = addUser(data.name, roomID, data.socketid);
        socket.emit('enterGame', { user: user });
        socket.emit('log', { message: "welcome to " + roomID + ", " + data.name + ". waiting.." });
    });

    // Connect the other Players to the room. Show error if room full.
    socket.on('joinGame', function (data) {
        //var room = io.nsps['/'].adapter.rooms[data.room];
        console.log("recieved joinGame")
        roomID=data.room
        if (getRoomLength(roomID) <= 5) {
            socket.join(roomID);
            user = addUser(data.name, roomID, data.socketid);
            socket.emit('enterGame', { user: user });
            socket.emit('log', { message: "welcome to " + roomID + ", " + data.name + ". waiting.." });
        } else {
            socket.emit('menuErr', { message: 'room is full' });
        }
    });

    socket.on("reset", function(data) {
        io.sockets.emit("resetBoard")
        game(socket, users, data.room)
    });

    socket.on("playerSkull", async function(data) {
        console.log("recieved skull from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await playerSkull(socket, data.user)
    })

    socket.on("playerRose", async function(data) {
        console.log("recieved rose from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await playerRose(socket, data.user)
    })

    socket.on("playerBid", async function(data) {
        console.log("recieved bid from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await playerBid(socket, data.user)
    })

    socket.on("playerBidInc", async function(data) {
        console.log("recieved bidInc from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        console.log(data.bid)
        await playerBidInc(socket, data.user, data.bid)
    })

    socket.on("playerBidPass", async function(data) {
        console.log("recieved bidPass from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await playerBidPass(socket, data.user)
    })

    socket.on("playerSelection", async function(data) {
        console.log("recieved Selection from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        console.log('player chose mat ' + data.mat)
        await playerSelection(socket, data.user, data.mat)
    })

});

server.listen(process.env.PORT || 5000);

//                socket.on("playerBid", function(data) {
//                    bid=data.bid
//                    maxBid=getMaxBid(boardState)
//                    io.sockets.emit("prompt", { message: users[p]['name'] + "has made a bid of" + bid });
//
//                    // bid rotation
//                    choicebid=0
//                    do {
//                        p=(i+1) % boardState.length
//                        io.sockets.emit("prompt", { message: boardState[p]['name'] + "'s move.." });
// io.to(boardState[p]['socketid']).emit("prompt", { message: "the current bid is " + bid + ". bid or pass?" });
//
//                        socket.on("bidInc", function(data) {
//                            /// have to handle error msg
//                            choiceInc=0
//                            do {
//                                if(data.bid <= maxBid) {
//                                    bid = data.bid
//                                    io.sockets.emit("prompt", { message: boardState[p]['name'] + "has made a bid of " + data.bid });
//                                    io.sockets.emit("update", { data: boardState });
//                                    validChoiceBid=1
//                                } else {
// io.to(boardState[p]['socketid']).emit("prompt", { message: "bid out of range. the bid is " + bid + "." });
//                                }
//                            } while (choiceInc==0)
//
//                        })
//                        socket.on("bidPass", function() {
//                            boardState[p]['pass'] = 1
//                            io.sockets.emit("prompt", { message: boardState[p]['name'] + "has passed." });
//                            io.sockets.emit("update", { data: boardState });
//                        })
//
//                        if(getUsersPass(usersState) == 1) {
//                            break
//                        }
//                    } while (validBid==0)
//
//                    // bid selection
//                    challenger=getChallenger(boardState)
//                    do {
//                        io.sockets.emit("prompt", { message: currentPlayer['name'] + "the challenger is " + challenger['name'] });
//                        /// choose stacks
//                        io.to(challenger['socketid']).emit("prompt", { message: "chooose your stack." + bid + "." });
//                        socket.on("stackChoice", function() {
//                                console.log('hello')
//                        })
//                        /// connect buttons for other players
//                        /// counter for total discs and if its a skull etc
//                    } while (choiceBid==0)
//
//                    // bid resolution
//                })
//
//function getWinState(socket, users, p) {
//    var i
//    var winner=0
//    for (i = 0; i < users.length; i++) {
//        if(users[i]['win'] == 2) {
//            winner=users[i]
//        }
//    }
//    if(winner != 0) {
//        serverRound(socket, users, p)
//    } else {
//        io.sockets.emit("prompt", { message: "<strong>" + winner['name'] + "</strong> wins!" });
//    }
//}
