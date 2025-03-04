import { Component } from "../core/component.js";

export class FriendList extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.friendIds = new Set(); // Set of friend IDs
    this.pendingRequestIds = new Set(); // Set of IDs where we sent requests
    this.receivedRequestIds = new Set(); // Set of IDs from users who sent us requests
    this.loadUserData();
  }

  loadUserData() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      this.goNextPage("/login");
      return;
    }

    // Get friend list
    fetch("/pong/api/friend-list/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Friend data:", data);

          // Save friend IDs
          this.friendIds.clear();
          Object.keys(data.friend_list).forEach((id) => {
            this.friendIds.add(id);
          });

          // Save received request IDs
          this.receivedRequestIds.clear();
          Object.keys(data.friend_request_list).forEach((id) => {
            this.receivedRequestIds.add(id);
          });

          // Render friends and received requests
          this.renderFriendList(data.friend_list);
          this.renderRequestList(data.friend_request_list);

          // Get sent requests
          this.getPendingRequests();
        } else {
          console.log(data.message);
          this.goNextPage("/home");
        }
      })
      .catch((error) => {
        console.error("Error fetching friend data:", error);
        this.goNextPage("/home");
      });
  }

  // Get sent friend requests
  getPendingRequests() {
    fetch("/pong/api/pending-requests/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Pending requests:", data.pending_requests);

          // Save pending request IDs
          this.pendingRequestIds.clear();
          data.pending_requests.forEach((id) => {
            this.pendingRequestIds.add(id);
          });

          // Render sent requests
          this.renderPendingList();

          // Load user list after we have all relationship data
          this.loadUserList();
          this.attachEventListeners();
        }
      })
      .catch((error) => {
        console.error("Error fetching pending requests:", error);
      });
  }

  loadUserList() {
    fetch("/pong/api/user-list/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.renderUserList(data.user_list);
        } else {
          console.log(data.message);
          this.goNextPage("/home");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        this.goNextPage("/home");
      });
  }

  renderUserList(users) {
    if (!users || Object.keys(users).length === 0) {
      document.getElementById("user-list-content").innerHTML =
        "<p>No users found</p>";
      return;
    }

    console.log("Rendering user list with data:", users);
    // Filter: Only show users who aren't friends, haven't sent us requests, and haven't received requests from us
    const filteredUsers = Object.keys(users)
      .filter(
        (key) =>
          !this.friendIds.has(key) &&
          !this.pendingRequestIds.has(key) &&
          !this.receivedRequestIds.has(key)
      )
      .map((key) => {
        const user = users[key];
        console.log(`User ${user.username}, is_online:`, user.is_online);

        const onlineStatus = user.is_online ? "Online" : "Offline";
        const statusClass = user.is_online ? "online" : "offline";

        return `
          <li id="${key}" class="user-card">
            <div class="user-info">
              <img src="${user.avatar}" alt="${user.username}" class="avatar"/>
              <span class="username">${user.username}</span>
            </div>
            <div class="user-actions">
              <span class="status ${statusClass}">${onlineStatus}</span>
              <button class="btn btn-add" data-user-id="${key}">Add Friend</button>
            </div>
          </li>`;
      })
      .join("");

    if (filteredUsers) {
      document.getElementById("user-list-content").innerHTML = filteredUsers;
    } else {
      document.getElementById("user-list-content").innerHTML =
        "<p>No new users to add</p>";
    }

    this.addFriendButtons();
  }

  renderFriendList(friends) {
    if (!friends || Object.keys(friends).length === 0) {
      document.getElementById("friend-list-content").innerHTML =
        "<p>You don't have any friends yet</p>";
      return;
    }

    console.log("Rendering friends with data:", friends);
    const friendListHtml = Object.keys(friends)
      .map((key) => {
        const friend = friends[key];
        console.log(`Friend ${friend.username}, is_online:`, friend.is_online);

        const onlineStatus = friend.is_online ? "Online" : "Offline";
        const statusClass = friend.is_online ? "online" : "offline";

        return `
          <li id="${key}" class="user-card">
            <div class="user-info">
              <img src="${friend.avatar}" alt="${friend.username}" class="avatar"/>
              <span class="username">${friend.username}</span>
            </div>
            <div class="status-container">
              <span class="status ${statusClass}">${onlineStatus}</span>
            </div>
          </li>`;
      })
      .join("");

    document.getElementById("friend-list-content").innerHTML = friendListHtml;
  }

  renderRequestList(requests) {
    if (!requests || Object.keys(requests).length === 0) {
      document.getElementById("friend-request-list").innerHTML =
        "<p>No pending friend requests</p>";
      return;
    }

    const requestListHtml = Object.keys(requests)
      .map((key) => {
        const request = requests[key];
        const onlineStatus = request.is_online ? "Online" : "Offline";
        const statusClass = request.is_online ? "online" : "offline";

        return `
          <li id="${key}" class="user-card">
            <div class="user-info">
              <img src="${request.avatar}" alt="${request.username}" class="avatar"/>
              <span class="username">${request.username}</span>
              <span class="status ${statusClass}">${onlineStatus}</span>
            </div>
            <div class="request-actions" id="${key}">
              <button id="accept" class="btn btn-accept">Accept</button>
              <button id="reject" class="btn btn-reject">Reject</button>
            </div>
          </li>`;
      })
      .join("");

    document.getElementById("friend-request-list").innerHTML = requestListHtml;
  }

  // Render sent requests
  renderPendingList() {
    // Get user list to display usernames for pending requests
    fetch("/pong/api/user-list/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          const pendingHtml = Array.from(this.pendingRequestIds)
            .map((id) => {
              const user = data.user_list[id];
              if (!user) return ""; // Skip if user not found

              const onlineStatus = user.is_online ? "Online" : "Offline";
              const statusClass = user.is_online ? "online" : "offline";

              return `
                <li id="${id}" class="user-card">
                  <div class="user-info">
                    <img src="${user.avatar}" alt="${user.username}" class="avatar"/>
                    <span class="username">${user.username}</span>
                  </div>
                  <div class="status-container">
                    <span class="status ${statusClass}">${onlineStatus}</span>
                    <span class="pending-status">Request Sent</span>
                  </div>
                </li>`;
            })
            .join("");

          if (pendingHtml) {
            document.getElementById("sent-request-list").innerHTML =
              pendingHtml;
          } else {
            document.getElementById("sent-request-list").innerHTML =
              "<p>You haven't sent any friend requests</p>";
          }
        }
      });
  }

  handleAddFriend(friendId) {
    const token = localStorage.getItem("authToken");
    console.log("Adding friend with ID:", friendId);
    const formData = new FormData();
    formData.append("friend_id", friendId);
    fetch("/pong/api/add-friend/", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send friend request");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          // 通知メッセージを表示しない
          // this.showNotification(data.message || "Friend request sent successfully!");

          // ペンディングリストに追加
          this.pendingRequestIds.add(friendId);

          // 画面を更新
          this.loadUserData();
        } else {
          console.error(data.message || "Failed to send friend request");
        }
      })
      .catch((error) => {
        console.error("Error sending friend request:", error);
      });
  }

  acceptFriendRequest(friendId) {
    const token = localStorage.getItem("authToken");
    console.log("Accepting friend with ID:", friendId);
    const formData = new FormData();
    formData.append("friend_id", friendId);
    fetch("/pong/api/accept-friend/", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to accept friend request");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          // 通知メッセージを表示しない
          // this.showNotification(data.message || "Friend request accepted!");

          // リストに追加/削除
          this.friendIds.add(friendId);
          this.receivedRequestIds.delete(friendId);

          // 画面を更新
          this.loadUserData();
        } else {
          console.error(data.message || "Failed to accept friend request");
        }
      })
      .catch((error) => {
        console.error("Error accepting friend request:", error);
      });
  }

  rejectFriendRequest(friendId) {
    const token = localStorage.getItem("authToken");
    console.log("Rejecting friend with ID:", friendId);
    const formData = new FormData();
    formData.append("friend_id", friendId);
    fetch("/pong/api/reject-friend/", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to reject friend request");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          // 通知メッセージを表示しない
          // this.showNotification(data.message || "Friend request rejected");

          // リストから削除
          this.receivedRequestIds.delete(friendId);

          // 画面を更新
          this.loadUserData();
        } else {
          console.error(data.message || "Failed to reject friend request");
        }
      })
      .catch((error) => {
        console.error("Error rejecting friend request:", error);
      });
  }

  attachEventListeners() {
    this.findElement("go-home").onclick = () => {
      this.goNextPage("/home");
    };

    // Tab switching event listeners
    document.getElementById("friend-tab").onclick = () =>
      this.showTab("friend");
    document.getElementById("request-tab").onclick = () =>
      this.showTab("request");
    document.getElementById("sent-tab").onclick = () => this.showTab("sent");
    document.getElementById("find-tab").onclick = () => this.showTab("find");

    // Friend request buttons event listeners
    const acceptButtons = document.querySelectorAll(
      '#friend-request-list button[id="accept"]'
    );
    acceptButtons.forEach((button) => {
      const requestItem = button.closest("li");
      const friendId = requestItem.id;
      button.onclick = (e) => {
        e.preventDefault();
        this.acceptFriendRequest(friendId);
      };
    });

    const rejectButtons = document.querySelectorAll(
      '#friend-request-list button[id="reject"]'
    );
    rejectButtons.forEach((button) => {
      const requestItem = button.closest("li");
      const friendId = requestItem.id;
      button.onclick = (e) => {
        e.preventDefault();
        this.rejectFriendRequest(friendId);
      };
    });

    // Add Friend buttons event listeners
    this.addFriendButtons();
  }

  // Tab switching function
  showTab(tabName) {
    console.log("Switching to tab:", tabName);

    // Hide all tab sections
    document.querySelectorAll(".tab-section").forEach((section) => {
      section.style.display = "none";
    });

    // Remove active class from all tabs
    document.querySelectorAll(".tab-menu li").forEach((tab) => {
      tab.classList.remove("active");
    });

    // Show the selected tab content and set the tab as active
    if (tabName === "friend") {
      document.getElementById("friend-list-section").style.display = "block";
      document.getElementById("friend-tab").classList.add("active");
    } else if (tabName === "request") {
      document.getElementById("friend-request-section").style.display = "block";
      document.getElementById("request-tab").classList.add("active");
    } else if (tabName === "sent") {
      document.getElementById("sent-request-section").style.display = "block";
      document.getElementById("sent-tab").classList.add("active");
    } else if (tabName === "find") {
      document.getElementById("user-list-section").style.display = "block";
      document.getElementById("find-tab").classList.add("active");
    }
  }

  // Add Friendボタンのイベントリスナーを設定する独立したメソッド
  addFriendButtons() {
    const addButtons = document.querySelectorAll(".btn-add");
    console.log("Found Add Friend buttons:", addButtons.length);

    addButtons.forEach((button) => {
      const userId = button.getAttribute("data-user-id");
      button.onclick = (e) => {
        e.preventDefault();
        console.log("Add friend clicked for user:", userId);
        this.handleAddFriend(userId);
      };
    });
  }

  // 通知表示用のヘルパーメソッド
  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒後に通知を消す
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }

  get html() {
    return `
      <div class="friend-container">
        <h1>Friend Management</h1>
        
        <ul class="tab-menu">
          <li id="friend-tab" class="active">Friends</li>
          <li id="request-tab">Friend Requests</li>
          <li id="sent-tab">Sent Requests</li>
          <li id="find-tab">Find Friends</li>
        </ul>
        
        <div class="tab-content">
          <div id="friend-list-section" class="tab-section">
            <h2>Friends List</h2>
            <ul id="friend-list-content" class="card-list"></ul>
          </div>
          
          <div id="friend-request-section" class="tab-section" style="display: none;">
            <h2>Friend Requests</h2>
            <ul id="friend-request-list" class="card-list"></ul>
          </div>
          
          <div id="sent-request-section" class="tab-section" style="display: none;">
            <h2>Sent Friend Requests</h2>
            <ul id="sent-request-list" class="card-list"></ul>
          </div>
          
          <div id="user-list-section" class="tab-section" style="display: none;">
            <h2>Find New Friends</h2>
            <ul id="user-list-content" class="card-list"></ul>
          </div>
        </div>
        
        <button id="go-home" class="btn btn-home">Back to Home</button>
        
        <style>
          .friend-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .tab-menu {
            display: flex;
            list-style-type: none;
            padding: 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
          }
          
          .tab-menu li {
            padding: 10px 20px;
            cursor: pointer;
            margin-right: 5px;
            border: 1px solid #ccc;
            border-bottom: none;
            border-radius: 5px 5px 0 0;
            background-color: #f1f1f1;
          }
          
          .tab-menu li.active {
            background-color: white;
            border-bottom: 1px solid white;
            margin-bottom: -1px;
            font-weight: bold;
          }
          
          .card-list {
            list-style-type: none;
            padding: 0;
          }
          
          .user-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border: 1px solid #ddd;
            margin-bottom: 10px;
            border-radius: 5px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .user-info {
            display: flex;
            align-items: center;
          }
          
          .avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
          }
          
          .username {
            font-weight: bold;
            font-size: 16px;
          }
          
          .status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-left: 10px;
          }
          
          .status.online {
            background-color: #4CAF50;
            color: white;
          }
          
          .status.offline {
            background-color: #9e9e9e;
            color: white;
          }
          
          .user-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          
          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
          }
          
          .btn-add {
            background-color: #4CAF50;
            color: white;
            margin-top: 5px;
          }
          
          .btn-add:hover {
            background-color: #388E3C;
          }
          
          .btn-pending {
            background-color: #9e9e9e;
            color: white;
            cursor: not-allowed;
          }
          
          .request-actions {
            display: flex;
            gap: 10px;
          }
          
          .btn-accept {
            background-color: #2196F3;
            color: white;
          }
          
          .btn-accept:hover {
            background-color: #1976D2;
          }
          
          .btn-reject {
            background-color: #F44336;
            color: white;
          }
          
          .btn-reject:hover {
            background-color: #D32F2F;
          }
          
          .btn-home {
            background-color: #673AB7;
            color: white;
            margin-top: 20px;
          }
          
          .btn-home:hover {
            background-color: #512DA8;
          }
          
          .pending-status {
            font-style: italic;
            color: #666;
            font-size: 12px;
            margin-top: 5px;
          }
          
          .status-container {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
        </style>
      </div>
    `;
  }
}
