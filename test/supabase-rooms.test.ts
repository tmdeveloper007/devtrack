import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mockFrom },
}));

import {
  getRoomsForUser,
  getRoomById,
  getRoomMembers,
  addRoomMember,
  getRoomMessages,
  sendRoomMessage,
  removeRoomMember,
} from "@/lib/supabase-rooms";

function resolved(data: unknown, error: unknown | null = null) {
  return Promise.resolve({ data, error });
}
function rejected(err: unknown) {
  return Promise.reject(err);
}

describe("getRoomsForUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("maps owner role to is_owner=true", async () => {
    const rows = [{
      role: "owner",
      collaboration_rooms: { id: "r1", name: "Room1", description: null, repo_owner: "octo", repo_name: "repo", created_by: "octo", created_at: "2024-01-01", updated_at: "2024-01-01" },
    }];
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => resolved(rows) }),
    });

    const result = await getRoomsForUser("octocat");
    expect(result).toHaveLength(1);
    expect(result[0].is_owner).toBe(true);
  });

  it("maps member role to is_owner=false", async () => {
    const rows = [{
      role: "member",
      collaboration_rooms: { id: "r1", name: "Room1", description: null, repo_owner: "octo", repo_name: "repo", created_by: "octo", created_at: "2024-01-01", updated_at: "2024-01-01" },
    }];
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => resolved(rows) }),
    });

    const result = await getRoomsForUser("octocat");
    expect(result[0].is_owner).toBe(false);
  });

  it("throws when database returns an error", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => rejected(new Error("DB error")) }),
    });

    await expect(getRoomsForUser("octocat")).rejects.toThrow("DB error");
  });
});

describe("getRoomById", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null when user is not a room member", async () => {
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ eq: () => ({ single: () => resolved(null) }) }) }),
      });

    const result = await getRoomById("room-1", "stranger");
    expect(result).toBeNull();
  });

  it("returns room with is_owner=true for owner", async () => {
    const roomData = { id: "room-1", name: "Owner Room", created_by: "octocat" };
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ eq: () => ({ single: () => resolved({ role: "owner" }) }) }) }),
      })
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => resolved(roomData) }) }),
      });

    const result = await getRoomById("room-1", "octocat");
    expect(result?.is_owner).toBe(true);
  });

  it("returns room with is_owner=false for member", async () => {
    const roomData = { id: "room-1", name: "Member Room", created_by: "other" };
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ eq: () => ({ single: () => resolved({ role: "member" }) }) }) }),
      })
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ single: () => resolved(roomData) }) }),
      });

    const result = await getRoomById("room-1", "bob");
    expect(result?.is_owner).toBe(false);
  });
});

describe("getRoomMembers", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns members", async () => {
    const members = [{ room_id: "room-1", github_username: "alice", role: "owner", joined_at: "2024-01-01" }];
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => resolved(members) }) }),
    });

    const result = await getRoomMembers("room-1");
    expect(result).toEqual(members);
  });

  it("throws on database error", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => rejected(new Error("DB error")) }) }),
    });

    await expect(getRoomMembers("room-1")).rejects.toThrow("DB error");
  });
});

describe("addRoomMember", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not throw on successful insert", async () => {
    mockFrom.mockReturnValue({
      insert: () => resolved(null),
    });

    await expect(addRoomMember("room-1", "newuser")).resolves.toBeUndefined();
  });

  it("throws on database error", async () => {
    mockFrom.mockReturnValue({
      insert: () => rejected(new Error("DB error")),
    });

    await expect(addRoomMember("room-1", "newuser")).rejects.toThrow("DB error");
  });
});

describe("getRoomMessages", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns messages", async () => {
    const messages = [{ id: "msg-1", content: "Hello" }];
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => resolved(messages),
          }),
        }),
      }),
    });

    const result = await getRoomMessages("room-1", 50);
    expect(result).toEqual(messages);
  });
});

describe("sendRoomMessage", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns the created message", async () => {
    const msgData = { id: "msg-1", room_id: "room-1", sender_username: "alice", sender_avatar: null, content: "Hello", created_at: "2024-01-01" };
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => resolved(msgData) }) }),
    });

    const result = await sendRoomMessage("room-1", "alice", null, "Hello");
    expect(result.content).toBe("Hello");
  });

  it("throws on database error", async () => {
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => rejected(new Error("DB error")) }) }),
    });

    await expect(sendRoomMessage("room-1", "alice", null, "Hello")).rejects.toThrow("DB error");
  });
});

describe("removeRoomMember", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("does not throw on success", async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => resolved(null) }) }),
    });

    await expect(removeRoomMember("room-1", "olduser")).resolves.toBeUndefined();
  });

  it("throws on database error", async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => rejected(new Error("DB error")) }) }),
    });

    await expect(removeRoomMember("room-1", "olduser")).rejects.toThrow("DB error");
  });
});
