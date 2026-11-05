import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map as MapLibreMap,
} from "maplibre-gl";
import { BRAND, BRAND_DARK } from "./brand";

// Lines of sight drawn in mid-air, from the top of one tower to the top of the other, with each
// tower as a thin vertical stick. MapLibre's line layers are always draped on the terrain, hence
// this custom WebGL layer: each line is a ribbon widened in screen space (constant pixel width),
// with soft edges, dashes in pixels for the weakest level, and one line that can be highlighted.
// Drawn over the terrain, not depth-tested against it

export interface SightLine {
  from: [number, number, number]; // lon, lat, altitude of the tower top (metres, as rendered)
  to: [number, number, number];
  level: number; // index into VISIBILITY_LEVELS
  id: number; // the target site's index, for highlighting
}

export interface Tower {
  at: [number, number];
  ground: number; // metres, as rendered
  top: number;
}

const VERTEX = `#version 300 es
uniform mat4 u_matrix;
uniform vec2 u_viewport; // css px
uniform float u_highlight; // site id, -1 for none
uniform vec4 u_widths; // css px for levels 0-2 and the towers
in vec3 a_a;
in vec3 a_b;
in vec2 a_corner; // x: 0 = at a, 1 = at b; y: -1/+1 side
in vec2 a_meta; // x: level (3 = tower), y: site id
out float v_along; // css px from a
out float v_side;
out float v_level;
out float v_state; // 0 normal, 1 highlighted, 2 dimmed (another one is highlighted)
void main() {
  vec4 ca = u_matrix * vec4(a_a, 1.0);
  vec4 cb = u_matrix * vec4(a_b, 1.0);
  vec2 sa = ca.xy / ca.w * 0.5 * u_viewport;
  vec2 sb = cb.xy / cb.w * 0.5 * u_viewport;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 dir = len > 0.001 ? d / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  bool highlighted = u_highlight >= 0.0 && abs(a_meta.y - u_highlight) < 0.5;
  v_state = u_highlight < 0.0 ? 0.0 : highlighted ? 1.0 : 2.0;
  float width = u_widths[int(a_meta.x)] * (highlighted ? 2.0 : 1.0) + 1.0; // +1 for the soft edge

  vec4 c = a_corner.x < 0.5 ? ca : cb;
  c.xy += normal * a_corner.y * width * 0.5 / (0.5 * u_viewport) * c.w;
  gl_Position = c;
  v_along = a_corner.x * len;
  v_side = a_corner.y * width * 0.5;
  v_level = a_meta.x;
}`;

const FRAGMENT = `#version 300 es
precision highp float; // u_widths is shared with the vertex shader: same precision
uniform vec4 u_colors[4];
uniform vec4 u_widths;
uniform vec4 u_highlightColor;
in float v_along;
in float v_side;
in float v_level;
in float v_state;
out vec4 color;
void main() {
  int level = int(v_level + 0.5);
  // Weakest level: 6 px dashes
  if (level == 2 && v_state < 0.5 && mod(v_along, 10.0) > 6.0) discard;
  float half_width = u_widths[level] * (v_state > 0.5 && v_state < 1.5 ? 2.0 : 1.0) * 0.5;
  float edge = clamp(half_width + 0.5 - abs(v_side), 0.0, 1.0);
  vec4 base = v_state > 0.5 && v_state < 1.5 ? u_highlightColor : u_colors[level];
  float alpha = base.a * edge * (v_state > 1.5 ? 0.3 : 1.0);
  color = vec4(base.rgb * alpha, alpha);
}`;

function rgba(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

// a * translation(t), column-major
function translate(m: ArrayLike<number>, [x, y, z]: number[]) {
  const out = Float32Array.from(m);
  for (let i = 0; i < 4; i++)
    out[12 + i] = m[i]! * x! + m[4 + i]! * y! + m[8 + i]! * z! + m[12 + i]!;
  return out;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    console.error("Sight lines shader:", gl.getShaderInfoLog(shader));
  return shader;
}

export function createSightLinesLayer(id: string) {
  let map: MapLibreMap;
  let program: WebGLProgram;
  let vao: WebGLVertexArrayObject;
  let buffer: WebGLBuffer;
  let lineVertices = 0;
  let towerVertices = 0;
  let origin: [number, number, number] = [0, 0, 0];
  let highlight = -1;
  let dark = false; // light lines and towers for the dark map
  let vertices: Float32Array | null = null; // to upload on the next render
  // For pick(): each line's ends (relative to `origin`) and its site, and the last frame's matrix
  let pickable: { a: number[]; b: number[]; id: number }[] = [];
  let lastMatrix: Float32Array | null = null;
  const uniforms: Record<string, WebGLUniformLocation | null> = {};

  const layer: CustomLayerInterface & {
    setData: (lines: SightLine[], towers: Tower[]) => void;
    setHighlight: (id: number | null) => void;
    setDark: (value: boolean) => void;
    pick: (x: number, y: number, tolerance?: number) => number | null;
  } = {
    id,
    type: "custom",
    renderingMode: "3d",

    onAdd(m, gl) {
      map = m;
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      // MapLibre doesn't report errors thrown here: log them
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error("Sight lines shader:", gl.getProgramInfoLog(program));
      for (const name of [
        "u_matrix",
        "u_viewport",
        "u_highlight",
        "u_widths",
        "u_colors",
        "u_highlightColor",
      ])
        uniforms[name] = gl.getUniformLocation(program, name);

      vao = gl.createVertexArray()!;
      buffer = gl.createBuffer()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      // a_a (3), a_b (3), a_corner (2), a_meta (2)
      const stride = 10 * 4;
      [
        ["a_a", 3, 0],
        ["a_b", 3, 3],
        ["a_corner", 2, 6],
        ["a_meta", 2, 8],
      ].forEach(([name, size, offset]) => {
        const location = gl.getAttribLocation(program, name as string);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
          location,
          size as number,
          gl.FLOAT,
          false,
          stride,
          (offset as number) * 4,
        );
      });
      gl.bindVertexArray(null);
    },

    setData(lines, towers) {
      const first = lines[0]?.from ?? (towers[0] && [...towers[0].at, towers[0].ground]);
      origin = first ? toMercator(first as [number, number, number]) : [0, 0, 0];
      const data: number[] = [];
      const segment = (a: number[], b: number[], level: number, siteId: number) => {
        // Two triangles: (a,-1) (a,+1) (b,-1), (b,-1) (a,+1) (b,+1)
        for (const [end, side] of [
          [0, -1],
          [0, 1],
          [1, -1],
          [1, -1],
          [0, 1],
          [1, 1],
        ])
          data.push(...a, ...b, end!, side!, level, siteId);
      };
      pickable = [];
      for (const line of lines) {
        const a = relative(line.from);
        const b = relative(line.to);
        segment(a, b, line.level, line.id);
        pickable.push({ a, b, id: line.id });
      }
      lineVertices = lines.length * 6;
      for (const tower of towers)
        segment(relative([...tower.at, tower.ground]), relative([...tower.at, tower.top]), 3, -2);
      towerVertices = towers.length * 6;
      vertices = new Float32Array(data);
      map?.triggerRepaint();
    },

    // The site whose line passes nearest (in css pixels) to a point on the map, as last drawn
    pick(x, y, tolerance = 8) {
      if (!lastMatrix || !pickable.length) return null;
      const m = lastMatrix;
      const { width, height } = cssSize();
      const toScreen = ([px, py, pz]: number[]) => {
        const w = m[3]! * px! + m[7]! * py! + m[11]! * pz! + m[15]!;
        if (w <= 0) return null; // behind the camera
        return [
          ((m[0]! * px! + m[4]! * py! + m[8]! * pz! + m[12]!) / w + 1) * 0.5 * width,
          (1 - (m[1]! * px! + m[5]! * py! + m[9]! * pz! + m[13]!) / w) * 0.5 * height,
        ];
      };
      let best: number | null = null;
      let bestDistance = tolerance;
      for (const line of pickable) {
        const a = toScreen(line.a);
        const b = toScreen(line.b);
        if (!a || !b) continue;
        const [dx, dy] = [b[0]! - a[0]!, b[1]! - a[1]!];
        const t = Math.max(
          0,
          Math.min(1, ((x - a[0]!) * dx + (y - a[1]!) * dy) / (dx * dx + dy * dy || 1)),
        );
        const distance = Math.hypot(x - (a[0]! + t * dx), y - (a[1]! + t * dy));
        if (distance < bestDistance) {
          bestDistance = distance;
          best = line.id;
        }
      }
      return best;
    },

    // The dark map's colours: each level's darkColor, light towers and highlight
    setDark(value) {
      dark = value;
      map?.triggerRepaint();
    },

    setHighlight(siteId) {
      highlight = siteId ?? -1;
      map?.triggerRepaint();
    },

    render(gl, args) {
      if (vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        vertices = null;
      }
      if (!lineVertices && !towerVertices) return;
      gl.useProgram(program);
      lastMatrix = translate(args.defaultProjectionData.mainMatrix as ArrayLike<number>, origin);
      gl.uniformMatrix4fv(uniforms.u_matrix!, false, lastMatrix);
      const { width, height } = cssSize();
      gl.uniform2f(uniforms.u_viewport!, width, height);
      gl.uniform1f(uniforms.u_highlight!, highlight);
      gl.uniform4f(uniforms.u_widths!, 2, 1.5, 1.2, 2);
      gl.uniform4fv(
        uniforms.u_colors!,
        [
          ...VISIBILITY_LEVELS.map((level, i) =>
            rgba(dark ? level.darkColor : level.color, [0.8, 0.7, 0.75][i]!),
          ),
          rgba(ink(), 0.75), // towers
        ].flat(),
      );
      gl.uniform4fv(uniforms.u_highlightColor!, rgba(ink(), 1));

      gl.bindVertexArray(vao);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // Always over the terrain: the depth this layer computes doesn't match the terrain's at closer
      // zooms (the lines vanished into the hills they clear), and the lines are what the visitor
      // came to see
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.STENCIL_TEST);
      // Towers only when the map is tilted: seen from above they are dots
      const count = lineVertices + (map.getPitch() > 5 ? towerVertices : 0);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.bindVertexArray(null);
    },

    onRemove(_m, gl) {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };

  // The map's size in css px. Not the canvas's pixels over devicePixelRatio: MapLibre lowers its
  // pixel ratio when the canvas would pass maxCanvasSize (4096 px, e.g. a large window on a 5K
  // screen), and then lines came out too wide and pick() missed them
  function cssSize() {
    const canvas = map.getCanvas();
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  }

  function ink() {
    return dark ? BRAND_DARK.basalt : BRAND.basalt;
  }

  function toMercator([lon, lat, altitude]: [number, number, number]): [number, number, number] {
    const m = MercatorCoordinate.fromLngLat([lon, lat], altitude);
    return [m.x, m.y, m.z];
  }

  function relative(point: number[]) {
    const [x, y, z] = toMercator(point as [number, number, number]);
    return [x - origin[0], y - origin[1], z - origin[2]];
  }

  return layer;
}
