export type Member = {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
};

export type Group = {
  id: string;
  name: string;
  motto: string;
  invite_code: string;
  members: Member[];
};

export type Task = {
  id: string;
  group_id: string;
  content: string;
  type: "todo" | "note";
  assignee_name: string | null;
  status: "pending" | "done";
  position_x: number;
  position_y: number;
  rotation: number;
  color: string | null;
  is_pinned: boolean;
  due_date: string | null;
  reactions: Record<string, number>;
  created_at: string;
  completed_at: string | null;
};
