import React, { useState, useEffect } from "react";

/* ================= TYPES ================= */

type Tag = {
  id?: number | string;
  name: string;
  data?: string;
  children?: Tag[];
};

/* ================= INITIAL ================= */

const initialTree: Tag = {
  name: "root",
  children: [],
};

/* ================= UTIL ================= */

const generateId = () => Math.random().toString(36).substring(2, 9);

function attachIds(node: Tag): Tag {
  return {
    ...node,
    id: node.id || generateId(),
    children: node.children?.map(attachIds),
  };
}

function cleanTree(node: Tag): Tag {
  return {
    name: node.name,
    ...(node.data !== undefined && { data: node.data }),
    ...(node.children && { children: node.children.map(cleanTree) }),
  };
}

/* ================= TAG VIEW ================= */

type Props = {
  node: Tag;
  updateNode: (node: Tag) => void;
  depth?: number;
};

const TagView: React.FC<Props> = ({ node, updateNode, depth = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const updateChild = (index: number, updatedChild: Tag) => {
    const newChildren = [...(node.children || [])];
    newChildren[index] = updatedChild;
    updateNode({ ...node, children: newChildren });
  };

  const handleAddChild = () => {
    const newChild: Tag = {
      id: generateId(),
      name: "New Child",
      data: "Data",
    };

    if (node.data !== undefined) {
      updateNode({
        ...node,
        data: undefined,
        children: [newChild],
      });
    } else {
      updateNode({
        ...node,
        children: [...(node.children || []), newChild],
      });
    }
  };

  return (
    <div
      style={{
        marginLeft: depth * 12,
        borderLeft: "1px solid #2a2a2a",
        paddingLeft: 12,
        marginTop: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#111",
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #222",
        }}
      >
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? ">" : "v"}
        </button>

        {editingName ? (
          <input
            autoFocus
            defaultValue={node.name}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateNode({
                  ...node,
                  name: (e.target as HTMLInputElement).value,
                });
                setEditingName(false);
              }
            }}
            style={{
              background: "#000",
              color: "#fff",
              border: "1px solid #333",
              padding: "2px 6px",
            }}
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            style={{ fontWeight: 600, cursor: "pointer" }}
          >
            {node.name}
          </span>
        )}

        <button
          onClick={handleAddChild}
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 6,
            background: "#1f2937",
            border: "1px solid #374151",
          }}
        >
          + Child
        </button>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 8 }}>
          {node.data !== undefined && (
            <input
              value={node.data}
              onChange={(e) =>
                updateNode({ ...node, data: e.target.value })
              }
              style={{
                width: "100%",
                background: "#0a0a0a",
                border: "1px solid #333",
                padding: 6,
                borderRadius: 6,
                marginBottom: 6,
              }}
            />
          )}

          {node.children?.map((child, i) => (
            <TagView
              key={child.id || i}
              node={child}
              depth={depth + 1}
              updateNode={(updatedChild) => updateChild(i, updatedChild)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ================= MAIN APP ================= */

const App: React.FC = () => {
  const [trees, setTrees] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const API_URL = "http://localhost:8000/trees";

  /* ---------- TOAST ---------- */

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  /* ---------- FETCH ---------- */

  const fetchTrees = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();

      const data = await res.json();

      if (data.length === 0) {
        setTrees([attachIds(initialTree)]);
      } else {
        setTrees(data.map((t: Tag) => attachIds(t)));
      }

      setError(null);
    } catch {
      setError("Backend not connected");
      setTrees([attachIds(initialTree)]);
    }
  };

  useEffect(() => {
    fetchTrees();
  }, []);

  /* ---------- SAVE ---------- */

  const saveTree = async (tree: Tag) => {
    try {
      const method = tree.id ? "PUT" : "POST";
      const url = tree.id ? `${API_URL}/${tree.id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanTree(tree)),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setError(null);
      showToast("Tree saved successfully");
      return data;
    } catch {
      setError("Backend not connected");
      showToast("Save failed");
    }
  };

  /* ---------- DELETE ALL ---------- */

  const deleteAllTrees = async () => {
    try {
      const res = await fetch(API_URL, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setTrees([attachIds(initialTree)]);
      setError(null);
      showToast("All trees deleted");
    } catch {
      setError("Backend not connected");
      showToast("Delete failed");
    }
  };

  /* ---------- EXPORT ---------- */

  const handleExport = async (index: number) => {
    const cleaned = cleanTree(trees[index]);
    const json = JSON.stringify(cleaned, null, 2);

    setExported(json);

    const saved = await saveTree({
      ...cleaned,
      id: typeof trees[index].id === "number" ? trees[index].id : undefined,
    });

    if (saved?.id) {
      setTrees((prev) =>
        prev.map((t, i) =>
          i === index ? { ...t, id: saved.id } : t
        )
      );
    }
  };

  /* ---------- UI ---------- */

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0c", color: "#e5e7eb", padding: 30 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>Nested Tags Editor</h1>

        {/* Error */}
        {error && (
          <div style={{ background: "#7f1d1d", padding: 10, borderRadius: 6, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ background: "#065f46", padding: 10, borderRadius: 6, marginBottom: 20 }}>
            {toast}
          </div>
        )}

        {/* Buttons */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => {
              setTrees((prev) => [...prev, attachIds(initialTree)]);
              showToast("New tree added");
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#16a34a",
              color: "white",
              border: "none",
              marginRight: 10,
            }}
          >
            + New Tree
          </button>

          <button
            onClick={deleteAllTrees}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#dc2626",
              color: "white",
              border: "none",
            }}
          >
            Delete All Trees
          </button>
        </div>

        {/* Trees */}
        {trees.map((tree, i) => (
          <div key={tree.id || i} style={{ marginBottom: 30 }}>
            <TagView
              node={tree}
              updateNode={(updated) => {
                setTrees((prev) =>
                  prev.map((t, idx) => (idx === i ? updated : t))
                );
              }}
            />

            <button
              onClick={() => handleExport(i)}
              style={{
                marginTop: 10,
                padding: "6px 12px",
                borderRadius: 6,
                background: "#2563eb",
                color: "white",
                border: "none",
              }}
            >
              Export & Save Tree {i + 1}
            </button>
          </div>
        ))}

        {/* JSON Output */}
        {exported && (
          <pre
            style={{
              marginTop: 20,
              background: "#020617",
              padding: 14,
              borderRadius: 8,
              border: "1px solid #1e293b",
              fontSize: 12,
              overflow: "auto",
            }}
          >
            {exported}
          </pre>
        )}
      </div>
    </div>
  );
};

export default App;
