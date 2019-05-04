(function init() {

//const socket = io.connect('http://localhost:5000');
const socket = io.connect('https://skullnrose.herokuapp.com');

socket.on('connect', function() {
    console.log(socket.id)
});

window.onload = function() {

    var users = document.getElementById("users");
    var prompt = document.getElementById("prompt");
    var log = document.getElementById("log");
    var room

    var p0 = document.getElementById("p0");
    var p1 = document.getElementById("p1");
    var p2 = document.getElementById("p2");
    var p3 = document.getElementById("p3");
    var p4 = document.getElementById("p4");
    var p0Title = document.getElementById("p0Title");
    var p1Title = document.getElementById("p1Title");
    var p2Title = document.getElementById("p2Title");
    var p3Title = document.getElementById("p3Title");
    var p4Title = document.getElementById("p4Title");

    var addAI = document.getElementById("addAI");
    var skull = document.getElementById("skull");
    var rose = document.getElementById("rose");
    var bid = document.getElementById("bid");
    var bidInc = document.getElementById("bidInc");
    var bidPass = document.getElementById("bidPass");
    var bidSliderTable= document.getElementById("bidSliderTable");
    var bidSliderNum = document.getElementById("bidSliderNum");

    skull.style.display="none"
    rose.style.display="none"
    bid.style.display="none"
    bidInc.style.display="none"
    bidPass.style.display="none"
    bidSliderTable.style.display="none"

    var user;
    var bidNum=2;

    // sockets
    // players on site
    socket.on('users', function (data) {
        users.innerHTML = "<strong>players: <\/strong>" + data.users;
    });

    // lobby
    function displayBoard(message) {
      $('.menu').css('display', 'none');
      $('.gameBoard').css('display', 'block');
    }

    function displayMenu(message) {
      $('.menu').css('display', 'block');
      $('.gameBoard').css('display', 'none');
    }

    // New Game created by current client. Update the UI and create new Game var.
    $('#new').on('click', () => {
      console.log('create')
      const name = $('#nameNew').val();
      if (!name) {
        alert('Please enter your name.');
        return;
      }
      room = name
      socket.emit('createGame', { name:name, socketid:socket.id });
    });

    $('#join').on('click', () => {
      console.log('join')
      const name = $('#nameJoin').val();
      const roomID = $('#room').val();
      if (!name || !roomID) {
        alert('Please enter your name and game ID.');
        return;
      }
      socket.emit('joinGame', { name:name, room:roomID, socketid:socket.id });
    });

    socket.on('log', function (data) {
        console.log('recieved err')
        join = data.message
        join.innerHTML = logText
    });

    // New Game created by current client. Update the UI and create new Game var.
    socket.on('enterGame', function(data) {
      console.log('recieved enterGame')
      user=data.user
      console.log(user)
      displayBoard();
    });


    // game logic 
    // update game state
    socket.on('update', function (data) {
        log.innerHTML = data.boardState;
    });

    // game prompt
    socket.on('prompt', function (data) {
        console.log('recieved prompt')
        prompt.innerHTML = data.message;
    });

    // game log
    var logText=""
    socket.on('log', function (data) {
        console.log('recieved log')
        logText = data.message + "<br />" + logText 
        log.innerHTML = logText
    });

    // update board
    socket.on('updateBoard', function (data) {
        console.log('recieved updateBoard ' + data.p + " with " + data.message)
        switch(data.p){
            case 0:
                p0.innerHTML = data.message
                break
            case 1:
                p1.innerHTML = data.message
                break
            case 2:
                p2.innerHTML = data.message
                break
            case 3:
                p3.innerHTML = data.message
                break
            case 4:
                p4.innerHTML = data.message
                break
        }
    });


    // start game and game functions
    reset.onclick = async function() {
        var logText=""
        log.innerHTML=logText
        socket.emit('reset', { room:user.room })
        console.log('reset')
    }

    addAI.onclick = async function() {
        logText = user.name + " added an AI player<br />" + logText 
        log.innerHTML=logText
        socket.emit('joinGameAI', { room:user.room })
    }

    socket.on('assignPlayer', function(data) {
      console.log('recieved enterGame')
      user['p']=data.p
      console.log('user is now ')
      console.log(user)
    });

    socket.on('assignPlayerTitle', function (data) {
        switch(data.p){
            case 0:
                p0Title.innerHTML = data.name
                break
            case 1:
                p1Title.innerHTML = data.name
                break
            case 2:
                p2Title.innerHTML = data.name
                break
            case 3:
                p3Title.innerHTML = data.name
                break
            case 4:
                p4Title.innerHTML = data.name
                break
        }
    });

    socket.on('resetBoard', function () {
        console.log('recieved resetBoard')
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        bidPass.style.display="none"
        bidInc.style.display="none"
        bidSliderTable.style.display="none"
    });

    socket.on('resetBoardMats', function () {
        console.log('recieved resetBoardMats')
        p0.innerHTML = ""
        p1.innerHTML = ""
        p2.innerHTML = ""
        p3.innerHTML = ""
        p4.innerHTML = ""
    });

    socket.on('hideExtraMats', function (data) {
        p0.style.display="initial"
        p0Title.style.display="initial"
        p1.style.display="initial"
        p1Title.style.display="initial"
        p2.style.display="initial"
        p2Title.style.display="initial"
        p3.style.display="initial"
        p3Title.style.display="initial"
        p4.style.display="initial"
        p4Title.style.display="initial"
        switch(data.pTotal){
            case 1:
                p1.style.display="none"
                p1Title.style.display="none"
                p2.style.display="none"
                p2Title.style.display="none"
                p3.style.display="none"
                p3Title.style.display="none"
                p4.style.display="none"
                p4Title.style.display="none"
                break
            case 2:
                p2.style.display="none"
                p2Title.style.display="none"
                p3.style.display="none"
                p3Title.style.display="none"
                p4.style.display="none"
                p4Title.style.display="none"
                break
            case 3:
                p3.style.display="none"
                p3Title.style.display="none"
                p4.style.display="none"
                p4Title.style.display="none"
                break
            case 4:
                p4.style.display="none"
                p4Title.style.display="none"
                break
            case 5:
                break
        }
    });

    increaseValue.onclick = function() {
        bidNum=bidNum+1
        bidSliderNum.innerHTML = bidNum;
    }

    decreaseValue.onclick = function() {
        bidNum=bidNum-1
        bidSliderNum.innerHTML = bidNum;
    }

    //buttons
    rose.onclick = function() {
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        socket.emit("playerRose", { user:user });
        console.log('rose')
    }
    skull.onclick = function() {
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        socket.emit("playerSkull", { user:user });
        console.log('skull')
    }
    bid.onclick = function(num) {
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        bidSliderTable.style.display="none"
        socket.emit("playerBid", { user:user, bid: bidNum });
        console.log('bid')
    }

    bidPass.onclick = function() {
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        bidInc.style.display="none"
        bidPass.style.display="none"
        bidSliderTable.style.display="none"
        socket.emit("playerBidPass", { user:user });
        console.log('playerBidPass')
    }

    bidInc.onclick = function(num) {
        skull.style.display="none"
        rose.style.display="none"
        bid.style.display="none"
        bidInc.style.display="none"
        bidPass.style.display="none"
        bidSliderTable.style.display="none"
        socket.emit("playerBidInc", { user:user, bid: bidNum });
        console.log('playerBidInc')
    }

    p0.onclick = function(num) {
        console.log('recieved playerSelection for 0')
        p0.disabled = true
        p1.disabled = true
        p2.disabled = true
        p3.disabled = true
        p4.disabled = true
        socket.emit("playerSelection", { user:user, mat: 0});
    }
    p1.onclick = function(num) {
        console.log('recieved playerSelection for 1')
        p0.disabled = true
        p1.disabled = true
        p2.disabled = true
        p3.disabled = true
        p4.disabled = true
        socket.emit("playerSelection", { user:user, mat: 1});
    }

    p2.onclick = function(num) {
        console.log('recieved playerSelection for 2')
        p0.disabled = true
        p1.disabled = true
        p2.disabled = true
        p3.disabled = true
        p4.disabled = true
        socket.emit("playerSelection", { user:user, mat: 2});
    }

    p3.onclick = function(num) {
        console.log('recieved playerSelection for 3')
        p0.disabled = true
        p1.disabled = true
        p2.disabled = true
        p3.disabled = true
        p4.disabled = true
        socket.emit("playerSelection", { user:user, mat: 3});
    }

    p4.onclick = function(num) {
        console.log('recieved playerSelection for 4')
        p0.disabled = true
        p1.disabled = true
        p2.disabled = true
        p3.disabled = true
        p4.disabled = true
        socket.emit("playerSelection", { user:user, mat: 4});
    }

    // turn functions
    socket.on('playerTurn', function (data) {
        console.log('recieved playerTurn, running on client')
        prompt.innerHTML = data.message;
        skull.style.display="initial"
        rose.style.display="initial"
        bid.style.display="initial"
    });

    socket.on('playerTurnBidInitial', function (data) {
        console.log('recieved playerTurnBidInitial, running on client')
        prompt.innerHTML = data.message;
        bidInc.style.display="initial"
        bidSliderTable.style.display="initial"
    });

    socket.on('playerTurnBid', function (data) {
        console.log('recieved playerTurnBid, running on client')
        prompt.innerHTML = data.message;
        bidInc.style.display="initial"
        bidPass.style.display="initial"
        bidSliderTable.style.display="initial"
    });

    socket.on('playerTurnSelection', function (data) {
        console.log('recieved playerTurnSelection, running on client')
        document.getElementById("p0").disabled = false; 
        document.getElementById("p1").disabled = false; 
        document.getElementById("p2").disabled = false; 
        document.getElementById("p3").disabled = false; 
        document.getElementById("p4").disabled = false; 
        prompt.innerHTML = data.message;
    });
}
}());
