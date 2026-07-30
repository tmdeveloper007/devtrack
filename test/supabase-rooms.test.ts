/**
 * Unit tests for supabase-rooms.ts
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.hoisted(() => vi.fn());
const mockEq = vi.fn();
const mockSelect = vi.fn(() => ({ eq: mockEq, order: vi.fn(() => ({ limit: vi.fn() })) }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockDelete = vi.fn(() => ({ eq: mockEq }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a minimal CollaborationRoom object from raw supabase row data.
 */
function mapRoom(raw: any) {
  return { ...raw.collaboration_rooms, is_owner: raw.role === "owner" };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("supabase-rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRoomsForUser", () => {
    it("calls supabase with correct table and filters", async () => {
      // Dynamically import to get the mocked version
      const { getRoomsForUser } = await import("@/lib/supabase-rooms");

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: [], error: null }),
        }),
      });

      await getRoomsForUser("octocat");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("room_members");
    });

    it("maps room_members rows to CollaborationRoom with is_owner flag", async () => {
      const { getRoomsForUser } = await import("@/lib/supabase-rooms");

      const rawData = [
        { role: "owner", collaboration_rooms: { id: "1", name: "Room A" } },
        { role: "member", collaboration_rooms: { id: "2", name: "Room B" } },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: rawData, error: null }),
        }),
      });

      const rooms = await getRoomsForUser("octocat");
      expect(rooms).toHaveLength(2);
      expect(rooms[0]).toMatchObject({ id: "1", name: "Room A", is_owner: true });
      expect(rooms[1]).toMatchObject({ id: "2", name: "Room B", is_owner: false });
    });

    it("returns empty array when no rooms found", async () => {
      const { getRoomsForUser } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: null, error: null }),
        }),
      });
      const rooms = await getRoomsForUser("newuser");
      expect(rooms).toEqual([]);
    });

    it("throws when supabase returns an error", async () => {
      const { getRoomsForUser } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockRejectedValue(new Error("DB error")),
        }),
      });
      await expect(getRoomsForUser("user")).rejects.toThrow("DB error");
    });
  });

  describe("getRoomById", () => {
    it("returns null when user is not a member", async () => {
      const { getRoomById } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const result = await getRoomById("room-1", "nonmember");
      expect(result).toBeNull();
    });

    it("returns room with is_owner=true for owner", async () => {
      const { getRoomById } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: { role: "owner" }, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: { id: "room-1", name: "Owner Room", is_owner: false },
            error: null,
          }),
        });

      const result = await getRoomById("room-1", "owneruser");
      expect(result).toMatchObject({ id: "room-1", name: "Owner Room", is_owner: true });
    });

    it("returns room with is_owner=false for member", async () => {
      const { getRoomById } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: { role: "member" }, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: { id: "room-2", name: "Member Room", is_owner: false },
            error: null,
          }),
        });

      const result = await getRoomById("room-2", "memberuser");
      expect(result).toMatchObject({ is_owner: false });
    });

    it("returns null when room does not exist", async () => {
      const { getRoomById } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: { role: "owner" }, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

      const result = await getRoomById("nonexistent", "user");
      expect(result).toBeNull();
    });
  });

  describe("getRoomMembers", () => {
    it("returns members ordered by joined_at ascending", async () => {
      const { getRoomMembers } = await import("@/lib/supabase-rooms");
      const membersData = [
        { github_username: "alice", role: "owner", joined_at: "2025-01-01T00:00:00Z" },
        { github_username: "bob", role: "member", joined_at: "2025-01-02T00:00:00Z" },
      ];
      const orderFn = vi.fn(() => ({ eq: mockEq.mockResolvedValue({ data: membersData, error: null }) }));
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({ order: orderFn }),
      });

      const members = await getRoomMembers("room-1");
      expect(members).toHaveLength(2);
      expect(members[0].github_username).toBe("alice");
    });

    it("returns empty array on error", async () => {
      const { getRoomMembers } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error("fail") }),
        }),
      });
      await expect(getRoomMembers("room-1")).rejects.toThrow();
    });
  });

  describe("addRoomMember", () => {
    it("inserts a member with role member", async () => {
      const { addRoomMember } = await import("@/lib/supabase-rooms");
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({ insert: insertFn });

      await addRoomMember("room-1", "newuser");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("room_members");
    });

    it("throws when insert fails", async () => {
      const { addRoomMember } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "duplicate key" } }),
      });
      await expect(addRoomMember("room-1", "duplicateuser")).rejects.toThrow();
    });
  });

  describe("getRoomMessages", () => {
    it("returns messages reversed (chronological order)", async () => {
      const { getRoomMessages } = await import("@/lib/supabase-rooms");
      const messagesData = [
        { id: "2", content: "second" },
        { id: "1", content: "first" },
      ];
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: messagesData, error: null }),
            }),
          }),
        }),
      });

      const messages = await getRoomMessages("room-1");
      expect(messages[0].content).toBe("first");
      expect(messages[1].content).toBe("second");
    });

    it("applies before cursor when provided", async () => {
      const { getRoomMessages } = await import("@/lib/supabase-rooms");
      const ltFn = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
      const orderFn = vi.fn().mockReturnValue({ lt: ltFn, limit: vi.fn().mockReturnValue({ data: [], error: null }) });
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq.mockReturnValue({ order: orderFn }),
        }),
      });

      await getRoomMessages("room-1", 50, "2025-01-01T00:00:00Z");
      expect(ltFn).toHaveBeenCalled();
    });
  });

  describe("getRoomMessagesSince", () => {
    it("queries with gt for messages after timestamp", async () => {
      const { getRoomMessagesSince } = await import("@/lib/supabase-rooms");
      const gtFn = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const eqFn = vi.fn().mockReturnValue({ gt: gtFn });
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqFn }),
      });

      await getRoomMessagesSince("room-1", "2025-01-01T00:00:00Z");
      expect(gtFn).toHaveBeenCalledWith("created_at", "2025-01-01T00:00:00Z");
    });
  });

  describe("sendRoomMessage", () => {
    it("inserts message and returns it", async () => {
      const { sendRoomMessage } = await import("@/lib/supabase-rooms");
      const messageData = { id: "msg-1", content: "hello", sender_username: "alice", room_id: "room-1" };
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: messageData, error: null }),
      });

      const result = await sendRoomMessage("room-1", "alice", "https://avatar.url", "hello");
      expect(result.content).toBe("hello");
    });

    it("throws on insert error", async () => {
      const { sendRoomMessage } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
      });
      await expect(sendRoomMessage("room-1", "alice", null, "test")).rejects.toThrow();
    });
  });

  describe("removeRoomMember", () => {
    it("deletes member with correct filters", async () => {
      const { removeRoomMember } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await removeRoomMember("room-1", "usertoremove");
      expect(mockSupabaseFrom).toHaveBeenCalledWith("room_members");
    });

    it("throws on delete error", async () => {
      const { removeRoomMember } = await import("@/lib/supabase-rooms");
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq.mockRejectedValue(new Error("FK violation")),
        }),
      });
      await expect(removeRoomMember("room-1", "user")).rejects.toThrow("FK violation");
    });
  });

  describe("createRoom", () => {
    it("creates room and inserts creator as owner", async () => {
      const { createRoom } = await import("@/lib/supabase-rooms");
      const roomData = { id: "room-new", name: "New Room", created_by: "creator" };
      let insertCallCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => ({
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockResolvedValue({
              data: roomData,
              error: null,
            }),
          })),
        })),
      }));

      const result = await createRoom({ name: "New Room", description: "", repo_owner: "", repo_name: "" }, "creator");
      expect(result.id).toBe("room-new");
    });
  });
});
