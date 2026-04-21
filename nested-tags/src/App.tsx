import React, { useState } from "react";

/* ================= TYPES ================= */

type Tag = {
  id?: string;
  name: string;
  data?: string;
  children?: Tag[];
};

/* ================= INITIAL DATA ================= */

const initialTree: Tag = {
  name: "root",
  children: [
    {
      name: "child1",
      children: [
        { name: "child1-child1", data: "c1-c1 Hello" },
        { name: "child1-child2", data: "c1-c2 JS" }
      ]
    },
    { name: "child2", data: "c2 World" }
  ]
};

/* ================= UTIL ================= */

const generateId = () => Math.random().toString(36).substring(2, 9);

function attachIds(node: Tag): Tag {
  return {
    ...node,
    id: node.id || generateId(),
    children: node.children?.map(attachIds)
  };
}

function cleanTree(node: Tag): Tag {
  return {
    name: node.name,
    ...(node.data !== undefined && { data: node.data }),
    ...(node.children && { children: node.children.map(cleanTree) })
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

  /* ---------- Handlers ---------- */

  const updateChild = (index: number, updatedChild: Tag) => {
    const newChildren = [...(node.children || [])];
    newChildren[index] = updatedChild;
    updateNode({ ...node, children: newChildren });
  };

  const handleAddChild = () => {
    const newChild: Tag = {
      id: generateId(),
      name: "New Child",
      data: "Data"
    };

    if (node.data !== undefined) {
      updateNode({
        ...node,
        data: undefined,
        children: [newChild]
      });
    } else {
      updateNode({
        ...node,
        children: [...(node.children || []), newChild]
      });
    }
  };

  /* ---------- UI ---------- */

  return (
    <div
      style={{
        marginLeft: depth * 12,
        borderLeft: "1px solid #2a2a2a",
        paddingLeft: 12,
        marginTop: 10
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#111",
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #222"
        }}
      >
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? ">" : "v"}
        </button>

        {/* Editable Name */}
        {editingName ? (
          <input
            autoFocus
            defaultValue={node.name}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateNode({ ...node, name: (e.target as HTMLInputElement).value });
                setEditingName(false);
              }
            }}
            style={{
              background: "#000",
              color: "#fff",
              border: "1px solid #333",
              padding: "2px 6px"
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
            border: "1px solid #374151"
          }}
        >
          + Child
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div style={{ marginTop: 8 }}>
          {/* Data */}
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
                marginBottom: 6
              }}
            />
          )}

          {/* Children */}
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
  const [tree, setTree] = useState<Tag>(attachIds(initialTree));
  const [exported, setExported] = useState("");

  /* ---------- API ---------- */

  const API_URL = "http://localhost:8000/trees";

  const saveTree = async (data: Tag) => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });
      return await res.json();
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  /* ---------- Export ---------- */

  const handleExport = async () => {
    const cleaned = cleanTree(tree);
    const json = JSON.stringify(cleaned, null, 2);

    setExported(json);

    await saveTree(cleaned);
  };

  /* ---------- UI ---------- */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0c",
        color: "#e5e7eb",
        padding: 30,
        fontFamily: "Inter, sans-serif"
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>
          Nested Tags Editor
        </h1>

        <TagView node={tree} updateNode={setTree} />

        {/* Actions */}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#2563eb",
              border: "none",
              color: "white",
              fontWeight: 500
            }}
          >
            Export & Save
          </button>
        </div>

        {/* Output */}
        {exported && (
          <pre
            style={{
              marginTop: 20,
              background: "#020617",
              padding: 14,
              borderRadius: 8,
              border: "1px solid #1e293b",
              fontSize: 12,
              overflow: "auto"
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
