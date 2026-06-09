export interface BlogPost {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  title: string;
  summary: string;
  body: string;
  comment_count: number;
}

export interface BlogComment {
  id: string;
  post_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  body: string;
}

export interface CreateBlogPostInput {
  userId: string;
  title: string;
  summary: string;
  body: string;
}

export interface UpdateBlogPostInput {
  id: string;
  title: string;
  summary: string;
  body: string;
}
