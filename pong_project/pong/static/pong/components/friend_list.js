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

    // 最新のユーザーリストデータを取得してオンラインステータスをチェックする
    fetch("/pong/api/user-list/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((userData) => {
        if (userData.status === "success") {
          const userList = userData.user_list;

          const requestListHtml = Object.keys(requests)
            .map((key) => {
              const request = requests[key];
              console.log("Request user data:", request);

              // userListからオンラインステータスを取得
              const user = userList[key];
              const isOnline = user && user.is_online === true;
              const onlineStatus = isOnline ? "Online" : "Offline";
              const statusClass = isOnline ? "online" : "offline";

              console.log(
                `Request from ${request.username}, is_online:`,
                isOnline
              );

              return `
                <li id="${key}" class="user-card">
                  <div class="user-info">
                    <img src="${request.avatar}" alt="${request.username}" class="avatar"/>
                    <span class="username">${request.username}</span>
                  </div>
                  <div class="user-actions">
                    <span class="status ${statusClass}">${onlineStatus}</span>
                    <div class="request-actions" id="${key}">
                      <button id="accept" class="btn btn-accept">Accept</button>
                      <button id="reject" class="btn btn-reject">Reject</button>
                    </div>
                  </div>
                </li>`;
            })
            .join("");

          document.getElementById("friend-request-list").innerHTML =
            requestListHtml;

          // リクエストボタンにイベントリスナーを再度追加
          this.attachEventListeners();
        }
      });
  }

  // Render sent requests
  renderPendingList() {
    // タイムスタンプをクエリパラメータに追加してキャッシュを回避
    const timestamp = new Date().getTime();
    fetch(`/pong/api/user-list/?t=${timestamp}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("最新のユーザーリストデータ:", data.user_list); // デバッグ用

          const pendingHtml = Array.from(this.pendingRequestIds)
            .map((id) => {
              const user = data.user_list[id];
              if (!user) return ""; // Skip if user not found

              console.log(
                `Sent request to user ${user.username}, is_online:`,
                user.is_online
              ); // デバッグ用

              // データ形式の違いに対応
              const isOnline = user.is_online === true;
              const onlineStatus = isOnline ? "Online" : "Offline";
              const statusClass = isOnline ? "online" : "offline";

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
      <div class="container py-5">
        <h2 class="neon-text text-center mb-4">FRIEND MANAGEMENT</h2>
        
        <ul class="tab-menu mb-4">
          <li id="friend-tab" class="active">FRIENDS</li>
          <li id="request-tab">REQUESTS</li>
          <li id="sent-tab">SENT</li>
          <li id="find-tab">FIND</li>
        </ul>
        
        <div class="tab-content">
          <div id="friend-list-section" class="tab-section">
            <h3 class="neon-text-blue mb-3">FRIENDS LIST</h3>
            <ul id="friend-list-content" class="card-list"></ul>
          </div>
          
          <div id="friend-request-section" class="tab-section" style="display: none;">
            <h3 class="neon-text-blue mb-3">FRIEND REQUESTS</h3>
            <ul id="friend-request-list" class="card-list"></ul>
          </div>
          
          <div id="sent-request-section" class="tab-section" style="display: none;">
            <h3 class="neon-text-blue mb-3">SENT FRIEND REQUESTS</h3>
            <ul id="sent-request-list" class="card-list"></ul>
          </div>
          
          <div id="user-list-section" class="tab-section" style="display: none;">
            <h3 class="neon-text-blue mb-3">FIND NEW FRIENDS</h3>
            <ul id="user-list-content" class="card-list"></ul>
          </div>
        </div>
        
        <div class="text-center mt-4">
          <button id="go-home" class="neon-btn">BACK TO HOME</button>
        </div>
        
        <style>
          .tab-menu {
            display: flex;
            list-style-type: none;
            padding: 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #00f3ff;
            justify-content: center;
          }
          
          .tab-menu li {
            padding: 10px 20px;
            cursor: pointer;
            margin-right: 5px;
            border: 1px solid #00f3ff;
            border-bottom: none;
            border-radius: 5px 5px 0 0;
            background-color: rgba(0, 0, 0, 0.7);
            color: #fff;
            font-weight: bold;
            transition: all 0.3s ease;
          }
          
          .tab-menu li.active {
            background-color: rgba(0, 243, 255, 0.1);
            border-bottom: 1px solid #00f3ff;
            margin-bottom: -1px;
            color: #00f3ff;
            text-shadow: 0 0 5px #00f3ff, 0 0 10px #00f3ff;
          }
          
          .tab-menu li:hover:not(.active) {
            background-color: rgba(0, 243, 255, 0.1);
            color: #00f3ff;
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
            border: 1px solid #00f3ff;
            margin-bottom: 10px;
            border-radius: 5px;
            background-color: rgba(0, 0, 0, 0.7);
            box-shadow: 0 0 5px #00f3ff;
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
            border: 2px solid #00f3ff;
          }
          
          .username {
            font-weight: bold;
            font-size: 16px;
            color: #fff;
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
            text-shadow: 0 0 5px rgba(76, 175, 80, 0.7);
            box-shadow: 0 0 5px #4CAF50;
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
            transition: all 0.3s;
          }
          
          .btn-add {
            background-color: #4CAF50;
            color: white;
            margin-top: 5px;
            border: 1px solid #4CAF50;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.7);
          }
          
          .btn-add:hover {
            background-color: #388E3C;
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.9);
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
            border: 1px solid #2196F3;
            box-shadow: 0 0 5px rgba(33, 150, 243, 0.7);
          }
          
          .btn-accept:hover {
            background-color: #1976D2;
            box-shadow: 0 0 10px rgba(33, 150, 243, 0.9);
          }
          
          .btn-reject {
            background-color: #F44336;
            color: white;
            border: 1px solid #F44336;
            box-shadow: 0 0 5px rgba(244, 67, 54, 0.7);
          }
          
          .btn-reject:hover {
            background-color: #D32F2F;
            box-shadow: 0 0 10px rgba(244, 67, 54, 0.9);
          }
          
          .pending-status {
            font-style: italic;
            color: #00f3ff;
            font-size: 12px;
            margin-top: 5px;
          }
          
          .status-container {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          
          .tab-section {
            background-color: rgba(0, 0, 0, 0.7);
            border: 1px solid #00f3ff;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
          }
        </style>
      </div>
    `;
  }
}
