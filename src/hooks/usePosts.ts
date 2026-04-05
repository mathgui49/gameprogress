"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Post } from "@/types";
import { fetchAll, insertRow, deleteRow } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { fromRow } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function usePosts() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAll<Post>("posts", userId).then((data) => {
      setPosts(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (content: string, visibility: "wings" | "public") => {
      const item: Post = { id: generateId(), userId, content, visibility, createdAt: new Date().toISOString() };
      setPosts((prev) => [item, ...prev]);
      insertRow("posts", userId, item);
      return item;
    },
    [userId]
  );

  const remove = useCallback(
    (id: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      deleteRow("posts", id);
    },
    []
  );

  return { posts, loaded, add, remove };
}
