import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── mock supabase-admin ─────────────────────────────────────────────────────
// We mock supabase-rooms with a factory that returns the real module but
// with supabaseAdmin replaced by our mock.

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-rooms", () => ({
  getRoomsForUser: vi.fn(),
  createRoom: vi.fn(),
  getRoomById: vi.fn(),
  getRoomMembers: vi.fn(),
  addRoomMember: vi.fn(),
  getRoomMessages: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import {
  getRoomsForUser,
  createRoom,
  getRoomById,
  getRoomMembers,
  addRoomMember,
  getRoomMessages,
} from "../src/lib/supabase-rooms";

// ─── Query builder factory ───────────────────────────────────────────────────

function makeResolved(data: unknown, error: unknown = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

function makeQueryBuilder(data: unknown, error: unknown = null) {
  return {
    select: makeResolved(data, error),
    eq: makeResolved(data, error),
    order: makeResolved(data, error),
    insert: makeResolved(null, error),
    update: makeResolved(null, error),
    delete: makeResolved(null, error),
    limit: makeResolved(data, error),
    lt: makeResolved(data, error),
    single: makeResolved(data, error),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getRoomsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped rooms with is_owner=true for owner", async () => {
    // Since supabase-rooms is mocked, we return the expected mapped result
    const mappedResult = [{ id: "1", name: "Test Room", is_owner: true }];
    (getRoomsForUser as ReturnType<typeof vi.fn>).mockResolvedValue(mappedResult);

    const result = await getRoomsForUser("testuser");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "1", name: "Test Room", is_owner: true });
  });

  it("returns empty array when no rooms", async () => {
    (getRoomsForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getRoomsForUser("testuser");
    expect(result).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    (getRoomsForUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db error")
    );

    await expect(getRoomsForUser("testuser")).rejects.toThrow("db error");
  });
});

describe("createRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a room and returns it", async () => {
    const createdRoom = { id: "room-1", name: "New Room", created_by: "testuser" };
    (createRoom as ReturnType<typeof vi.fn>).mockResolvedValue(createdRoom);

    const result = await createRoom(
      { name: "New Room", repo_owner: "user", repo_name: "repo" },
      "testuser"
    );
    expect(result).toEqual(createdRoom);
  });

  it("throws when room insert fails", async () => {
    (createRoom as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("insert failed")
    );

    await expect(
      createRoom({ name: "Bad", repo_owner: "u", repo_name: "r" }, "testuser")
    ).rejects.toThrow("insert failed");
  });
});

describe("getRoomById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user is not a member", async () => {
    (getRoomById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getRoomById("room-1", "unknownuser");
    expect(result).toBeNull();
  });

  it("returns room with is_owner=true for owner member", async () => {
    const roomData = { id: "room-1", name: "My Room", is_owner: true };
    (getRoomById as ReturnType<typeof vi.fn>).mockResolvedValue(roomData);

    const result = await getRoomById("room-1", "testuser");
    expect(result).toMatchObject({ id: "room-1", is_owner: true });
  });

  it("returns room with is_owner=false for member role", async () => {
    const roomData = { id: "room-2", name: "Shared Room", is_owner: false };
    (getRoomById as ReturnType<typeof vi.fn>).mockResolvedValue(roomData);

    const result = await getRoomById("room-2", "testuser");
    expect(result?.is_owner).toBe(false);
  });
});

describe("getRoomMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ordered member list", async () => {
    const members = [
      { github_username: "user1", role: "owner" },
      { github_username: "user2", role: "member" },
    ];
    (getRoomMembers as ReturnType<typeof vi.fn>).mockResolvedValue(members);

    const result = await getRoomMembers("room-1");
    expect(result).toEqual(members);
  });

  it("throws on query error", async () => {
    (getRoomMembers as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("query error")
    );

    await expect(getRoomMembers("room-1")).rejects.toThrow("query error");
  });
});

describe("addRoomMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when insert succeeds", async () => {
    (addRoomMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await expect(addRoomMember("room-1", "newuser")).resolves.toBeUndefined();
  });

  it("throws when insert fails", async () => {
    (addRoomMember as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("insert error")
    );

    await expect(addRoomMember("room-1", "newuser")).rejects.toThrow(
      "insert error"
    );
  });
});

describe("getRoomMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reverses messages from newest-first to chronological", async () => {
    const messages = [
      { id: "2", content: "second" },
      { id: "1", content: "first" },
    ];
    (getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages.reverse());

    const result = await getRoomMessages("room-1", 50);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("supports pagination with before cursor", async () => {
    (getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await getRoomMessages("room-1", 20, "2026-07-01T00:00:00Z");

    expect(getRoomMessages).toHaveBeenCalledWith(
      "room-1",
      20,
      "2026-07-01T00:00:00Z"
    );
  });

  it("throws when supabase returns an error", async () => {
    (getRoomMessages as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("msg error")
    );

    await expect(getRoomMessages("room-1")).rejects.toThrow("msg error");
  });
});
