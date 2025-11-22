import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, MeshReflectorMaterial, Stars, Stage } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. 数据获取与处理 ---
// 将扁平的节点列表，转换成按“簇(Cluster)”分组的结构
function processDataToGallery(nodes) {
  const gallery = {};
  nodes.forEach(node => {
    const groupId = node.group || 0;
    if (!gallery[groupId]) gallery[groupId] = [];
    gallery[groupId].push(node);
  });
  return gallery; // { 0: [node, node], 1: [node] ... }
}

// --- 2. 3D 组件：单个展品 (The Artifact) ---
function Artifact({ position, text, delay }) {
  const [hovered, setHover] = useState(false);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[0, 0.5]}>
      <group position={position}>
        {/* 悬浮的方块 (代表知识点) */}
        <mesh
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          scale={hovered ? 1.2 : 1}
        >
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial
            color={hovered ? "#00ff88" : "#00aaff"}
            emissive={hovered ? "#00ff88" : "#0044aa"}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* 文字说明 (靠近展示，或者一直展示简略) */}
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
        >
          {hovered ? text : text.substring(0, 15) + "..."}
        </Text>

        {/* 装饰线连接到底座 */}
        <line>
          <bufferGeometry attach="geometry" setFromPoints={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -position[1], 0)]} />
          <lineBasicMaterial attach="material" color="#333" transparent opacity={0.5} />
        </line>
      </group>
    </Float>
  );
}

// --- 3. 3D 组件：展台 (The Pedestal) ---
// 每一个 Cluster 分配一个展台
function Pedestal({ position, nodes, label }) {
  // 计算展品在这个展台上的排列 (简单的圆形排列)
  const artifacts = useMemo(() => {
    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.5; // 散落在半径 1.5~2 米处
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1 + Math.random() * 1.5; // 高度错落
      return { ...node, localPos: [x, y, z] };
    });
  }, [nodes]);

  return (
    <group position={position}>
      {/* 地基柱子 */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 3, 0.5, 32]} />
        <meshStandardMaterial color="#222" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* 类别标题 */}
      <Text position={[0, 2.5, 0]} fontSize={0.5} color="#ffd700" anchorX="center">
        TOPIC {label}
      </Text>

      {/* 生成该类别的所有展品 */}
      {artifacts.map((item, i) => (
        <Artifact key={i} position={item.localPos} text={item.full_text} />
      ))}
    </group>
  );
}

// --- 4. 主场景：画廊 (The Gallery) ---
function GalleryScene({ data }) {
  const galleryData = useMemo(() => processDataToGallery(data.nodes), [data]);
  const groupIds = Object.keys(galleryData);

  return (
    <>
      {/* 灯光与环境 */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* 地板 (反射材质，增加高级感) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[50, 50]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#101010"
          metalness={0.5}
        />
      </mesh>

      {/* 动态生成展台 (按环形分布在房间里) */}
      {groupIds.map((gid, index) => {
        const angle = (index / groupIds.length) * Math.PI * 2;
        const radius = 8; // 展台距离中心的距离
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <Pedestal
            key={gid}
            position={[x, 0, z]}
            nodes={galleryData[gid]}
            label={gid}
          />
        );
      })}

      {/* 只有当没有数据时，显示中心欢迎语 */}
      {groupIds.length === 0 && (
        <Text position={[0, 2, 0]} fontSize={1} color="#555">
          Waiting for Knowledge...
        </Text>
      )}
    </>
  );
}

// --- 5. App 入口 ---
const DEFAULT_TEXT = `
建筑学是凝固的音乐。
古罗马的万神殿拥有世界上最大的无筋混凝土穹顶。
赖特是有机建筑的代表人物，设计了流水别墅。
包豪斯风格强调功能主义，少即是多。
中国古代建筑使用斗拱结构来支撑屋顶。
哥特式教堂以尖拱、飞扶壁和彩色玻璃窗为特征。
柯布西耶提出了现代建筑的五点原则。
参数化设计正在改变当代建筑的形态。
扎哈·哈迪德的作品充满了流动的线条。
四合院是北京传统的住宅形式。
`;

function App() {
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [graphData, setGraphData] = useState({ nodes: [] });
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://memory-palace-do03.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      const data = await response.json();
      if (data.nodes) setGraphData(data);
    } catch (error) {
      alert("请检查后端是否启动 (Port 8000)");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      {/* 2D UI 层 */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
        padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
        width: '300px', color: '#fff'
      }}>
        <h2 style={{ margin: '0 0 15px 0', letterSpacing: '2px', fontSize: '1.2rem' }}>
          🏛 MEMORY PALACE
        </h2>
        <textarea
          style={{
            width: '100%', height: '100px', background: 'rgba(0,0,0,0.5)',
            color: '#eee', border: 'none', borderRadius: '6px', padding: '8px',
            marginBottom: '10px'
          }}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#fff', border: 'none',
            borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#000',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? "BUILDING..." : "CONSTRUCT ROOM"}
        </button>
      </div>

      {/* 3D 场景层 */}
      <Canvas shadows camera={{ position: [0, 5, 15], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 10, 40]} />

        {/* 交互控制：允许用户旋转、缩放来参观房间 */}
        <OrbitControls
          maxPolarAngle={Math.PI / 2 - 0.05} // 防止视角穿入地下
          minDistance={2}
          maxDistance={30}
        />

        <GalleryScene data={graphData} />
      </Canvas>
    </div>
  );
}

export default App;
