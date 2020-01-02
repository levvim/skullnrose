const express = require('express');
const path = require('path');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var Moniker = require('moniker');
var async = require("async");

////////////////////////////////////////////////////////////////////////////////
//mongodb
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('mongoose connected')
});

//set up schema + db
var snr = new mongoose.Schema({
    userCurrent: {
        name: String,
        p: Number,
        skull: Number,
        rose: Number,
        boardRose: Number,
        boardSkull: Number,
        stack: [{type: String}],
        bid: Number,
        pass: Boolean,
        win: Number,
        ai: Boolean,
        room: String,
        socketid: String
    },
    userOthers: [{
        name: String,
        p: Number,
        skull: Number,
        rose: Number,
        boardRose: Number,
        boardSkull: Number,
        stack: [{type: String}],
        bid: Number,
        pass: Boolean,
        win: Number,
        ai: Boolean,
        room: String,
        socketid: String
    }],
    userState: {
        minBid: Number, //0 if no turnType!=3
        maxBid: Number, //0 if no turnType!=3
        turnType: Number, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: Number, //1 for skull 2 for rose 3 for bid
        bidChoice: Number, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: Number, //Amount to bid if bidInc, 0 otherwise
        selection: Number, //Selected mat, 99 if no selection
        win: Boolean //1 for win
    }
});

var snrLog = mongoose.model('snrLog', snr);

var saveSnrLog = async function(db, entry) {
    var entryTemp = new db(entry);
    entryTemp.save(function (err, entryTemp) {
       if (err) return console.error(err);
    });
}

var viewSnrLog = async function (db) {
    db.find(function (err, db) {
        if (err) return console.error(err);
        console.log(JSON.stringify(db,null,2));
    })
}

var Turn=[]
var saveTurn = async function(usersRoom, user, userState) {
    usersRoomTemp = usersRoom
    userTemp = user
    userStateTemp = userState
    for(var i=0; i<usersRoomTemp.length; i++) {
        if(userTemp['name']=== usersRoomTemp[i]['name']) {
            if(usersRoomTemp[i]['room'] == userTemp['room']){
                usersRoomTemp.splice(i, 1);
            }
        }
    }
    currentTurn=clone({userCurrent: userTemp, userOthers: usersRoomTemp, userState: userStateTemp})
    Turn.push(currentTurn)
    //console.log("turn after addition")
//    console.log(JSON.stringify(Turn,null,2));
}

var saveGame = async function(usersRoom, winner) {
    //set winner
    for(var i=0; i<Turn.length; i++) {
        if(Turn[i]['userCurrent']['name']==winner['name']) {
            Turn[i]['userState']['win']=1
        }
    }
    //console.log(JSON.stringify(Turn,null,2));
    console.log("saving to db");

    for(var i=0; i<Turn.length; i++) {
        await saveSnrLog(snrLog, Turn[i])
    }
    console.log('viewing log')
    console.log(Turn[1])
    //viewSnrLog(snrLog)
    console.log('log viewed')
    return null
    console.log('eval past null')
}

var savePlayerSkull = async function(user) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var userState = {
        minBid: 0, //0 if no turnType!=3
        maxBid: 0, //0 if no turnType!=3
        turnType: 1, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 1, //1 for skull 2 for rose 3 for bid
        bidChoice: 0, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: 0, //Amount to bid if bidInc, 0 otherwise
        selection: 99, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
}

var savePlayerRose= async function(user) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var userState = {
        minBid: 0, //0 if no turnType!=3
        maxBid: 0, //0 if no turnType!=3
        turnType: 1, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 2, //1 for skull 2 for rose 3 for bid
        bidChoice: 0, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: 0, //Amount to bid if bidInc, 0 otherwise
        selection: 99, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
}

var savePlayerBid= async function(user) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var userState = {
        minBid: 0, //0 if no turnType!=3
        maxBid: 0, //0 if no turnType!=3
        turnType: 1, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 3, //1 for skull 2 for rose 3 for bid, 0 otherwise
        bidChoice: 0, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: 0, //Amount to bid if bidInc, 0 otherwise
        selection: 99, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
}

var savePlayerBidInc= async function(user, bid) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var currentChallenger=getChallenger(usersRoom)
    var maxBidTemp=getMaxBid(usersRoom)
    var minBidTemp=currentChallenger['bid']+1
    var bidTemp=bid
    var userState = {
        minBid: minBidTemp, //0 if no turnType!=3
        maxBid: maxBidTemp, //0 if no turnType!=3
        turnType: 2, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 0, //1 for skull 2 for rose 3 for bid, 0 otherwise
        bidChoice: 1, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: bidTemp, //Amount to bid if bidInc, 0 otherwise
        selection: 99, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
}

var savePlayerPass= async function(user) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var currentChallenger=getChallenger(usersRoom)
    var maxBidTemp=getMaxBid(usersRoom)
    var minBidTemp=currentChallenger['bid']+1
    var userState = {
        minBid: minBidTemp, //0 if no turnType!=3
        maxBid: maxBidTemp, //0 if no turnType!=3
        turnType: 2, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 0, //1 for skull 2 for rose 3 for bid, 0 otherwise
        bidChoice: 2, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: 0, //Amount to bid if bidInc, 0 otherwise
        selection: 99, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
}

var savePlayerSelection = async function(user, mat) {
    var usersRoom=getUsersRoom(user['room'])
    var currentUser=getUser(user['room'], user['p'])
    var matTemp=mat
    var userState = {
        minBid: 0, //0 if no turnType!=3
        maxBid: 0, //0 if no turnType!=3
        turnType: 3, //1 for playerTurn 2 for playerBid 3 for playerSelection
        turnChoice: 0, //1 for skull 2 for rose 3 for bid, 0 otherwise
        bidChoice: 0, //1 for bidInc 2 for bidPass, 0 otherwise
        bidAmt: 0, //Amount to bid if bidInc, 0 otherwise
        selection: matTemp, //Selected mat, 99 if no selection
        win: 0 //1 for win
    }
    saveTurn(usersRoom, currentUser, userState)
    console.log('turn saved')
}

////////////////////////////////////////////////////////////////////////////////
//express
app.use(express.static('.'));

//connect index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let rooms = 0;
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
        ai: 0,
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

var addUserAI = function(name, room, socketid) {
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
        ai: 1,
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
    return user;
}

var removeUser = function(user) {
    for(var i=0; i<users.length; i++) {
        if(user.name === users[i].name) {
            if(users[i]['room'] == user.room){
                users.splice(i, 1);
                updateUsers(user.room);
                return;
            }
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

// Board functions
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

// Game functions
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
    console.log('nextplayerbid num ' + p + ' of room length ' + usersRoomTemp.length)
    //retrieve indice of p
    var currentP
    for(var i=0; i<usersRoomTemp.length; i++) {
        if(usersRoomTemp[i]['p']==p){
            currentP=i
        }
    }
    if(usersRoomTemp.length==1) {
        console.log('everyone passed. sending selection')
        return "99"
        console.log('keeps going?')
    } else if(currentP==usersRoomTemp.length-1) {
            console.log('nextPlayerBid is floored to 0' )
            return usersRoomTemp[0]['p']
    } else {
            currentP=currentP + 1
            console.log('nextPlayerBid is ' + currentP)
            return usersRoomTemp[currentP]['p']
    }
}

function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            }
        }
    }
    console.log('currentChallenger is ' + challenger['name'] + ' bid ' + challenger['bid'] )
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
        console.log('user lost a rose, user stats are now')
        dict['rose'] = dict['rose'] - 1
        console.log(dict)
    }
    if(userStackTemp[randomNumber] == 's') {
        console.log('user lost a skull, user stats are now')
        dict['skull'] = dict['skull'] - 1
        console.log(dict)
    }
}

// AI action resolution
async function playerTurnAI(socket, user) {
    userStackTemp=[]
    usersRoom=getUsersRoom(user.room)
    sleep(2000)

    //check if there is at least 1 disc per mat
    var count=0
    for(var i=0; i<usersRoom.length; i++) {
        count = count + parseInt(usersRoom[i]['boardSkull'])
        count = count + parseInt(usersRoom[i]['boardRose'] )
    }

    for (i = 0; i < (user['skull'] - user['boardSkull']); i++) {
        userStackTemp.push('s')
    }
    for (i = 0; i < (user['rose'] - user['boardRose']); i++) {
        userStackTemp.push('r')
    }
    //add slots for bidding
    if(count > usersRoom.length) {
        if(userStackTemp.length > 2) {
            userStackTemp.push('b')
            userStackTemp.push('b')
        } else {
            userStackTemp.push('b')
        }
    }
    console.log(userStackTemp)
    const randomNumber = Math.floor(Math.random() * userStackTemp.length);
    if(userStackTemp[randomNumber] == 'r') {
        console.log('AI chose to put down rose')
        await savePlayerRose(user)
        return playerRose(socket, user)
    }
    if(userStackTemp[randomNumber] == 's') {
        console.log('AI chose to put down skull')
        await savePlayerSkull(user)
        return playerSkull(socket, user)
    }
    if(userStackTemp[randomNumber] == 'b') {
        console.log('AI chose to bid')
        await savePlayerBid(user)
        return playerBid(socket, user)
    }
    if(userStackTemp.length == 0) {
        console.log('AI chose to bid')
        await savePlayerBid(user)
        return playerBid(socket, user)
    }
    console.log('TurnAI no resolve')
}

async function playerTurnBidInitialAI(socket, user) {
    sleep(2000)
    usersRoom=getUsersRoom(user['room'])
    currentChallenger=getChallenger(usersRoom)
    minBid=currentChallenger['bid'] + 1
    maxBid=getMaxBid(usersRoom)
    console.log('max bid is ' + maxBid + ' and min bid is ' + minBid)

    const bid = Math.floor(Math.random() * (maxBid - minBid + 1)) + minBid;
    console.log(user.name + ' ai is bidding ' + bid)
    await savePlayerBidInc(user, bid)
    await playerBidInc(socket, user, bid)
}

async function playerTurnBidAI(socket, user) {
    sleep(2000)
    usersRoom=getUsersRoom(user['room'])
    currentChallenger=getChallenger(usersRoom)
    minBid=currentChallenger['bid']
    maxBid=getMaxBid(usersRoom)

    const bidOrPass = Math.floor(Math.random() * 2);

    if(bidOrPass==0) {
        await playerTurnBidInitialAI(socket,user)
    } else {
        console.log(user.name + ' is passing')
        await savePlayerPass(user)
        await playerBidPass(socket,user)
    }
}

async function playerTurnSelectionAI(socket, user) {
    sleep(2000)
    usersRoom=getUsersRoom(user['room'])
    console.log('running playerTurnSelectionAI for' + user.name + ' with a bid of ' + user.bid)

    var pStack=[]

    if(user['stack'].length > 0){
        console.log('ai is picking own mat ' + user['p'])
        selection=user['p']
        await savePlayerSelection(user, selection)
        return playerSelection(socket, user, user['p'])
    } else {
        for (i = 0; i < usersRoom.length; i++) {
            if(usersRoom[i]['stack'].length > 0) {
                pStack.push(usersRoom[i]['p'])
            }
        }
        console.log(pStack)
        const randomNumber = Math.floor(Math.random() * pStack.length);
        selection=pStack[randomNumber]
        console.log('ai is picking mat ' + selection)

        await savePlayerSelection(user, selection)
        return playerSelection(socket, user, selection)
    }
}



// Player action resolution
async function playerSkull(socket, user) {
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    console.log('recieved skull' )
    if(currentUser['boardSkull'] < currentUser['skull'] ) {
        currentUser['boardSkull'] = currentUser['boardSkull'] + 1
        pushStack(user.room, user.p, 'skull')
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
    console.log('recieved playerBid from' + user['name'] )
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
         console.log('sending playerTurn err to p= ' + p)
         io.to(currentUser['socketid']).emit("playerTurn", { message: "each player must put down a disc to start." });
    } else {
        if(usersRoom[p]['name']==='ai'){
            await playerTurnBidInitialAI(socket, usersRoom[p])
        } else if(usersRoom[p]['ai']===0){
            io.to(currentUser['socketid']).emit("playerTurnBidInitial", { message: "propose a bid (max " + getMaxBid(usersRoom) + ")."});
        } else {
            await playerTurnBidInitialAI(socket, usersRoom[p])
        }
    }
}

async function playerBidInc(socket, user, bid) {
    sleep(2000)
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
        sleep(2000)
        console.log('sending bid err1 to p= ' + p)
        io.to(currentUser['socketid']).emit("playerTurnBidInitial", { message: "bid is too small. make another selection (max " + getMaxBid(usersRoom) + ")." });
    } else if (bid > getMaxBid(usersRoom)) {
        sleep(2000)
        console.log('sending bid err2 to p= ' + p)
        io.to(currentUser['socketid']).emit("playerTurnBidInitial", { message: "bid is too large. make another selection (max " + getMaxBid(usersRoom) + ")." });
    } else {
        currentUser['bid'] = bid
        currentChallenger=getChallenger(usersRoom)
        for (i = 0; i < usersRoom.length; i++) {
            console.log('sending prompt to ' + usersRoom[i]['socketid']  )
            await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " put down a bid of " + bid + " (" + "max " + getMaxBid(usersRoom) + ")."  });
            await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " put down a bid of " + bid + " (" + "max " + getMaxBid(usersRoom) + ")."  });
        }
        //updateChallengers, nextPlayerChallengers
        p = nextPlayerBid(user.room, user.p)
        console.log('p is ' + p)
        if(bid>=getMaxBid(usersRoom)) {
            p = currentChallenger['p']
            return serverTurnSelection(socket, users, user.room, p)
        } else if (p=="99") {
            //determine challenger after everyone passed
            challenger = usersRoom[0]
            for (i = 0; i < usersRoom.length; i++) {
                if(usersRoom[i]['bid'] > challenger['bid'] ) {
                        challenger = usersRoom[i]
                }
            }
            console.log('currentChallenger is ' + challenger['name'] + ' bid ' + challenger['bid'] )
            p=challenger['p']
            console.log('starting selection for player ' + currentChallenger['name'] + ' bid ' + currentChallenger['bid'])
            return serverTurnSelection(socket, users, user.room, p)
        } else {
            return serverTurnBid(socket, users, user.room, p)
        }
    }
}

async function playerBidPass(socket, user) {
    usersRoom=getUsersRoom(user.room)
    var currentUser=getUser(user.room, user.p)
    currentChallenger=getChallenger(usersRoom)

    console.log('player passed')
    for (i = 0; i < usersRoom.length; i++) {
        console.log('sending prompt to ' + usersRoom[i]['socketid']  )
        await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " passed." });
        await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " passed." });
    }

    console.log('player p=' + p + ' passed')

    p = nextPlayerBid(user.room, user.p)
    console.log(p)
    currentUser['pass'] = 1
    console.log(p)

    //updateChallengers, nextPlayerChallengers
    if(p=="99") {
        console.log('p relational statement works')
        //determine challenger after everyone passed
        challenger = usersRoom[0]
        for (i = 0; i < usersRoom.length; i++) {
            if(usersRoom[i]['bid'] > challenger['bid'] ) {
                    challenger = usersRoom[i]
            }
        }
        console.log('currentChallenger is ' + challenger['name'] + ' bid ' + challenger['bid'] )
        p=challenger['p']
        console.log('starting selection for player ' + currentChallenger['name'] + ' bid ' + currentChallenger['bid'])
        return serverTurnSelection(socket, users, user.room, p)
    } else {
        return serverTurnBid(socket, users, user.room, p)
    }
}

async function playerSelection(socket, user, mat) {
    sleep(2000)
    usersRoom=getUsersRoom(user.room)
    currentUser=getUser(user.room, user.p)
    //currentChallenger=getChallenger(usersRoom)
    currentChallenger=currentUser

    console.log('mat chosen is ' + mat)
    console.log('current user is ' + user['p'])

    if(currentChallenger['stack'].length != 0 && currentChallenger['p'] != mat) {
        console.log('stack err 1')
        console.log(mat)
        console.log(currentChallenger['stack'].length )
        console.log(currentChallenger['p'])
        io.to(currentUser['socketid']).emit("playerTurnSelection", { message: "you must clear your mats out first." });
    } else if(usersRoom[mat]['stack'].length == 0 ) {
        console.log('stack err 2')
        io.to(currentUser['socketid']).emit("playerTurnSelection", { message: "you must choose a non-empty mat." });
    } else {
        console.log('correct mat of choice ' + mat)
        matResult=usersRoom[mat]['stack'][usersRoom[mat]['stack'].length-1]
        console.log('mat result is ' + matResult)

        usersRoom[mat]['stack'].pop()

        if(matResult == 'rose') {
            currentUser['bid'] = currentUser['bid'] - 1
            console.log(currentUser['name'] + "'s bid is now " + currentUser['bid'])

            for (i = 0; i < usersRoom.length; i++) {
                console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a rose. " + usersRoom[p]['name'] + " has " + usersRoom[p]['bid'] + " to go." });
                await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[p]['name'] + " chose " + usersRoom[mat]['name'] + "'s mat and got a rose. " + usersRoom[p]['name'] + " has " + usersRoom[p]['bid'] + " to go." });
                await io.to(usersRoom[i]['socketid']).emit("updateBoard", { p:mat, message:usersRoom[mat]['stack'].length  });
            }

            if(currentUser['bid'] == 0){
                currentUser['win'] = currentUser['win'] + 1
                //updateUsers(user.room)
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
                    console.log('game finished by bid')
                    return saveGame(usersRoom, user)
                    console.log('eval past saveGame err')
                } else {
                    return serverRound(socket, users, user.room, p)
                }
            } else {
                sleep(2000)
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
                }
                removeUser(currentUser)
                //reset game with the players that are left over (shorten lobby)
                usersRoom=getUsersRoom(user.room)
                if(usersRoom.length==1) {
                    for (i = 0; i < usersRoom.length; i++) {
                        console.log('sending prompt to ' + usersRoom[i]['socketid']  )
                        await io.to(usersRoom[i]['socketid']).emit("prompt", { message: usersRoom[i]['name'] + " won the game!" });
                        await io.to(usersRoom[i]['socketid']).emit("log", { message: usersRoom[i]['name'] + " won the game!" });
                    }
                    console.log(usersRoom[0])
                    console.log('game finished by knockout')
                    return saveGame(usersRoom, usersRoom[0])
                    console.log('eval past saveGame err')
                } else {
                    for (i = 0; i < usersRoom.length; i++) {
                        usersRoom[i]['p'] = i
                        io.sockets.emit("hideExtraMats", { pTotal: usersRoom.length });
                        io.sockets.emit("assignPlayerTitle", { p: usersRoom[i]['p'], name: usersRoom[i]['name'] });
                        io.to(usersRoom[i]['socketid']).emit("assignPlayer", { p: usersRoom[i]['p'] });
                    }
                    p=randomStartPlayer(usersRoom.length) //starting player
                    return serverRound(socket, users, user.room, p)
                }
            } else {
                await io.to(currentUser['socketid']).emit("log", { message:  "you have " + currentUser['skull'] + " skulls and " + currentUser['rose'] + " roses left."});
                return serverRound(socket, users, user.room, p)
            }
        }
    }
    console.log('no resolve err')
}

//Turn functions
async function serverTurn(socket, users, room,  p) {
    console.log('STARTING NEW TURN p=' + p)
    usersRoom=getUsersRoom(room)
    // player turn with player as ai
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    if(usersRoom[p]['name']==='ai') {
        console.log('sending playerTurn to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnAI(socket, usersRoom[p])
    } else if (usersRoom[p]['ai']===0) {
        console.log('sending playerTurn to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        await io.to(usersRoom[p]['socketid']).emit("playerTurn", { message: "make your move."  });
    } else {
        console.log('sending playerTurn to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnAI(socket, usersRoom[p])
    }
}

async function serverTurnBid(socket, users, room,  p) {
    console.log('STARTING NEW BID TURN p=' + p)
    usersRoom=getUsersRoom(room)
        // if bid turn () is complete then pass to serverturnselection fn
    // player turn
        // TODO emit turn logs to only players in room w loop
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    if(usersRoom[p]['name']==='ai') {
        console.log('sending playerTurnBid to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnBidAI(socket, usersRoom[p])
    } else if(usersRoom[p]['ai']===0) {
        console.log('sending playerTurnBid to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        await io.to(usersRoom[p]['socketid']).emit("playerTurnBid", { message: "make your move "  });
    } else {
        console.log('sending playerTurnBid to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnBidAI(socket, usersRoom[p])
    }
}

async function serverTurnSelection(socket, users, room,  p) {
    console.log('STARTING NEW SELECTION turn p=' + p)
    usersRoom=getUsersRoom(room)
    io.sockets.emit("prompt", { message: usersRoom[p]['name'] + "'s move.." });
    if(usersRoom[p]['name']==='ai') {
        console.log('sending playerTurnSelection to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnSelectionAI(socket,usersRoom[p])
    } else if(usersRoom[p]['ai']===0) { 
        console.log('sending playerTurnSelection to p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        await io.to(usersRoom[p]['socketid']).emit("playerTurnSelection", { message: "choose a mat. "  });
    } else {
        console.log('sending playerTurnSelection to AI p=' + usersRoom[p]['p'] + " " + usersRoom[p]['socketid'])
        return playerTurnSelectionAI(socket,usersRoom[p])
    }
}

async function serverRound(socket, users, room, p) {
    console.log('STARTING NEW ROUND')
    usersRoom=getUsersRoom(room)
    // reset game state for new round
    await resetBoardState(usersRoom)
    for (i = 0; i < usersRoom.length; i++) {
        await io.to(usersRoom[i]['socketid']).emit("resetBoardMats");
        await io.to(usersRoom[i]['socketid']).emit("resetBoard");
    }
    return serverTurn(socket, users, room, p)
}

//Game functions
async function game(socket, users, room) {
    console.log('STARTING NEW GAME')
    usersRoom=getUsersRoom(room)

    await resetGameState(usersRoom)
    Turn=[]

    //say hello + assign players
    for (i = 0; i < usersRoom.length; i++) {
        console.log(usersRoom[i]['name'])
        usersRoom[i]['p'] = i
        io.sockets.emit("hideExtraMats", { pTotal: usersRoom.length });
        io.sockets.emit("assignPlayerTitle", { p: usersRoom[i]['p'], name: usersRoom[i]['name'] });
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

    //recieved game function sockets from client
    socket.on("reset", function(data) {
        io.sockets.emit("resetBoard")
        game(socket, users, data.room)
    });

    socket.on('joinGameAI', function (data) {
        console.log("recieved joinGameAI")
        roomID=data.room
        name=Moniker.choose()
        if (getRoomLength(roomID) <= 5) {
            socket.join(roomID);
            user = addUserAI(name, roomID, name);
        } else {
            socket.emit('prompt', { message: 'cannot add AI. room is full' });
        }
    });

    socket.on("playerSkull", async function(data) {
        console.log("recieved skull from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await savePlayerSkull(data.user)
        await playerSkull(socket, data.user)
    })

    socket.on("playerRose", async function(data) {
        console.log("recieved rose from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await savePlayerRose(data.user)
        await playerRose(socket, data.user)
    })

    socket.on("playerBid", async function(data) {
        console.log("recieved bid from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await savePlayerBid(data.user)
        await playerBid(socket, data.user)
    })

    socket.on("playerBidInc", async function(data) {
        console.log("recieved bidInc from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        console.log(data.bid)
        await savePlayerBidInc(data.user, data.bid)
        await playerBidInc(socket, data.user, data.bid)
    })

    socket.on("playerBidPass", async function(data) {
        console.log("recieved bidPass from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        await savePlayerPass(data.user)
        await playerBidPass(socket, data.user)
    })

    socket.on("playerSelection", async function(data) {
        console.log("recieved Selection from socket ")
        console.log(data.user['socketid'])
        console.log(data.user['p'])
        console.log('player chose mat ' + data.mat)
        await savePlayerSelection(data.user, data.mat)
        await playerSelection(socket, data.user, data.mat)
    })




});

server.listen(process.env.PORT || 5000);

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

////mongodb
//var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true});
//
//var db = mongoose.connection;
//db.on('error', console.error.bind(console, 'connection error:'));
//db.once('open', function() {
//    console.log('mongoose connected')
//});
//
////set up schema + db
//var snr = new mongoose.Schema({
//          name: String
//});
//var snrLog = mongoose.model('snrLog', snr);
//
//function saveSnrLog (db, entry) {
//    var entryTemp = new db(entry);
//    entryTemp.save(function (err, entryTemp) {
//       if (err) return console.error(err);
//    });
//}
//
//function viewSnrLog (db) {
//    db.find(function (err, db) {
//        if (err) return console.error(err);
//        console.log(db);
//    })
//}
//
//var fluffy = { name: 'fluffy' };
//console.log(fluffy)
//
//saveSnrLog(snrLog, fluffy)
//
//console.log('viewing log')
//viewSnrLog(snrLog)
//
///change pass to saveGame when the wincon is the only player left so that the winner is not the person's turn but the person who actually won
