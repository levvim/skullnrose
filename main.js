(function init() {

const socket = io.connect('http://localhost:5000');

socket.on('connect', function() {
    console.log(socket.id)
});

window.onload = function() {

    var users = document.getElementById("users");
    var prompt = document.getElementById("prompt");
    var log = document.getElementById("log");
    var room

    var p1 = document.getElementById("p1");
    var p2 = document.getElementById("p2");
    var p3 = document.getElementById("p3");
    var p4 = document.getElementById("p4");
    var p5 = document.getElementById("p5");

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

    // start game and game functions
    reset.onclick = async function() {
        log.innerHTML = " "
        socket.emit('reset', { room:user.room })
        console.log('reset')
    }

    socket.on('assignPlayer', function(data) {
      console.log('recieved enterGame')
      user['p']=data.p
      console.log('user is now ')
      console.log(user)
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
        console.log('bidInc')
    }

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

}
}());
