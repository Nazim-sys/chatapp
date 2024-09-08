'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var leaveButton = document.querySelector('.primary.leaveButton');
var stompClient = null;
var username = null;
var isDisconnecting = false;
var onlineContainer = document.querySelector('.onlineContainer');
var onlineUserList = document.querySelector('#onlineUsersList');
var onlineUsers = new Set(); // Track online users

var colors = [
    '#808080',
    '#696969',
    '#A9A9A9',
    '#555555',
    '#4F4F4F',
    '#2F4F4F',
    '#333333',
    '#1C1C1C'
];

function connect(event) {
    event.preventDefault();

    username = document.querySelector('#name').value.trim();

    if (username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        chatPage.classList.add('show');
        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);

    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({ sender: username, type: 'JOIN' })
    );

    connectingElement.classList.add('hidden');
}

function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

function leaveChat(event) {
    if (stompClient) {
        isDisconnecting = true;
        var chatMessage = {
            sender: username,
            type: 'LEAVE'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));

        stompClient.disconnect(() => {
            usernamePage.classList.remove('hidden');
            chatPage.classList.add('hidden');
            chatPage.classList.remove('show');
            document.querySelector('#name').value = '';
            location.reload();
        });
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    var messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
        addUserToOnlineUserlist(message.sender);
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
        removeUserFromOnlineUserList(message.sender);
    } else {
        if (message.sender === username) {
            messageElement.classList.add('sent-message');
        } else {
            messageElement.classList.add('chat-message');
        }

        var avatarElement = document.createElement('i');
        var avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        var usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

function addUserToOnlineUserlist(user) {
    if (!onlineUsers.has(user)) {
        onlineUsers.add(user);

        var userElement = document.createElement('li');
        userElement.setAttribute('id', 'user-' + user);
        userElement.classList.add('user');

        var usernamePara = document.createElement('p');
        usernamePara.textContent = user;

        var statusDot = document.createElement('p');
        statusDot.classList.add('status-dot');
        /*statusDot.style.backgroundColor = 'green';*/ 

        userElement.appendChild(usernamePara);
        userElement.appendChild(statusDot);
        onlineUserList.appendChild(userElement);
    }
}

function removeUserFromOnlineUserList(user) {
    if (onlineUsers.has(user)) {
        onlineUsers.delete(user);

        var userElement = document.getElementById('user-' + user);
        if (userElement) {
            onlineUserList.removeChild(userElement);
        }
    }
}

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
leaveButton.addEventListener('click', leaveChat, true);
