const crypto = require("crypto");
const store = require("./store");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function pageOptions(page, pageSize, defaultSize = DEFAULT_PAGE_SIZE) {
  return {
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.max(1, Math.min(MAX_PAGE_SIZE, Number(pageSize) || defaultSize)),
  };
}

function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

function pair(a, b) {
  return [a, b].sort();
}

function friendshipFor(db, userA, userB) {
  return (db.friendships || []).find((item) => {
    return (item.userAId === userA && item.userBId === userB)
      || (item.userAId === userB && item.userBId === userA);
  });
}

function pendingRequestFor(db, userA, userB) {
  return (db.friendRequests || []).find((item) => {
    return item.status === "pending"
      && ((item.fromUserId === userA && item.toUserId === userB)
        || (item.fromUserId === userB && item.toUserId === userA));
  });
}

function relation(db, currentUserId, otherUserId) {
  if (currentUserId === otherUserId) return "self";
  if (friendshipFor(db, currentUserId, otherUserId)) return "friend";
  const request = pendingRequestFor(db, currentUserId, otherUserId);
  if (!request) return "none";
  return request.fromUserId === currentUserId ? "pending_outgoing" : "pending_incoming";
}

function publicUser(user, currentUserId, db, isOnline) {
  return {
    id: user.id,
    username: user.username,
    relation: relation(db, currentUserId, user.id),
    online: Boolean(isOnline?.(user.id)),
  };
}

function search(currentUser, query, page, pageSize, isOnline) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return paginate([], 1, pageOptions(page, pageSize, 20).pageSize);

  const db = store.read();
  const options = pageOptions(page, pageSize, 20);
  const users = db.users
    .filter((user) => user.username.toLowerCase().includes(q))
    .sort((a, b) => {
      const aExact = a.username.toLowerCase() === q ? 0 : 1;
      const bExact = b.username.toLowerCase() === q ? 0 : 1;
      return aExact - bExact || a.username.localeCompare(b.username);
    })
    .map((user) => publicUser(user, currentUser.id, db, isOnline));
  return paginate(users, options.page, options.pageSize);
}

function list(currentUser, page, pageSize, isOnline) {
  const db = store.read();
  const options = pageOptions(page, pageSize);
  const friendIds = (db.friendships || []).flatMap((item) => {
    if (item.userAId === currentUser.id) return [item.userBId];
    if (item.userBId === currentUser.id) return [item.userAId];
    return [];
  });
  const users = friendIds
    .map((userId) => db.users.find((user) => user.id === userId))
    .filter(Boolean)
    .sort((a, b) => {
      const onlineDifference = Number(Boolean(isOnline?.(b.id))) - Number(Boolean(isOnline?.(a.id)));
      return onlineDifference || a.username.localeCompare(b.username);
    })
    .map((user) => publicUser(user, currentUser.id, db, isOnline));
  return paginate(users, options.page, options.pageSize);
}

function listRequests(currentUser) {
  const db = store.read();
  const pending = (db.friendRequests || []).filter((item) => item.status === "pending");
  const mapRequest = (request, otherId) => {
    const user = db.users.find((item) => item.id === otherId);
    return {
      id: request.id,
      user: user ? { id: user.id, username: user.username } : null,
      createdAt: request.createdAt,
    };
  };
  return {
    incoming: pending
      .filter((item) => item.toUserId === currentUser.id)
      .map((item) => mapRequest(item, item.fromUserId))
      .filter((item) => item.user),
    outgoing: pending
      .filter((item) => item.fromUserId === currentUser.id)
      .map((item) => mapRequest(item, item.toUserId))
      .filter((item) => item.user),
  };
}

function createRequest(currentUser, targetUserId) {
  const targetId = String(targetUserId || "");
  if (!targetId) throw httpError("User is required", 400);
  if (targetId === currentUser.id) throw httpError("You cannot add yourself", 400);

  return store.update((db) => {
    const target = db.users.find((user) => user.id === targetId);
    if (!target) throw httpError("User not found", 404);
    if (friendshipFor(db, currentUser.id, targetId)) throw httpError("Already friends", 409);
    const pending = pendingRequestFor(db, currentUser.id, targetId);
    if (pending) {
      const message = pending.fromUserId === currentUser.id
        ? "Friend request already sent"
        : "This user already sent you a request";
      throw httpError(message, 409);
    }
    const request = {
      id: id("friend_request"),
      fromUserId: currentUser.id,
      toUserId: targetId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.friendRequests.push(request);
    return request;
  });
}

function respond(currentUser, requestId, decision) {
  return store.update((db) => {
    const request = (db.friendRequests || []).find((item) => item.id === requestId);
    if (!request || request.status !== "pending") throw httpError("Pending request not found", 404);
    if (request.toUserId !== currentUser.id) throw httpError("Not allowed to update this request", 403);

    request.status = decision;
    request.respondedAt = new Date().toISOString();
    if (decision === "accepted" && !friendshipFor(db, request.fromUserId, request.toUserId)) {
      const [userAId, userBId] = pair(request.fromUserId, request.toUserId);
      db.friendships.push({
        id: id("friendship"),
        userAId,
        userBId,
        createdAt: request.respondedAt,
      });
    }
    return request;
  });
}

function remove(currentUser, otherUserId) {
  return store.update((db) => {
    const friendship = friendshipFor(db, currentUser.id, otherUserId);
    if (!friendship) throw httpError("Friendship not found", 404);
    db.friendships = db.friendships.filter((item) => item.id !== friendship.id);
    return { ok: true };
  });
}

function friendIds(userId) {
  return (store.read().friendships || []).flatMap((item) => {
    if (item.userAId === userId) return [item.userBId];
    if (item.userBId === userId) return [item.userAId];
    return [];
  });
}

module.exports = {
  createRequest,
  friendIds,
  list,
  listRequests,
  remove,
  respond,
  search,
};
