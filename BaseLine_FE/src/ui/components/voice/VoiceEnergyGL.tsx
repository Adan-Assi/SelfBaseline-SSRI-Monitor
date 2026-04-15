import { GLView } from "expo-gl";
import React, { useEffect, useRef } from "react";
import { ViewStyle } from "react-native";
import { log } from "../../../utils/logger";

type Props = {
  level01: number;
  style?: ViewStyle;
};

// --- Shaders ------------------------------------------------
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_level;
varying vec2 v_uv;

float saturate(float x){ return clamp(x, 0.0, 1.0); }

float ellipse(vec2 p, vec2 r){
  vec2 q = p / r;
  return dot(q,q);
}

float bulge(float k){
  float m = sin(3.14159265 * k);
  return pow(m, 0.90);
}

vec4 disc(vec2 p, vec2 center, vec2 r, float alpha, float rimPow, float glowPow){
  vec2 q = p - center;

  float e = ellipse(q, r);
  float inside = 1.0 - smoothstep(0.98, 1.02, e);
  float z = sqrt(max(0.0, 1.0 - e));

  vec3 C = vec3(23.0/255.0, 33.0/255.0, 231.0/255.0);

  float rim = smoothstep(0.72, 1.00, e) * inside;
  rim = pow(rim, rimPow) * (0.78 + 0.22 * z);

  float glow = exp(-pow(e, glowPow));

  vec3 col = C * inside;
  col += C * rim * 0.55;
  col += C * glow * 0.16;

  return vec4(col, inside * alpha);
}

void main(){
  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= u_res.x / u_res.y;

  float t = u_time;
  float L = saturate(u_level);

  float vig = smoothstep(1.65, 0.35, length(p * vec2(1.0, 1.1)));
  vec3 acc = vec3(0.01,0.01,0.03) * vig;

  vec2 c = vec2(0.0, -0.05);
  float breathe = 0.010 * sin(t * 2.0);

  float R_SCALE = 0.82;
  const int N = 8;

  float baseGap = mix(0.09, 0.14, L);
  float sizeGap = mix(0.06, 0.10, L);
  float topExtra = mix(0.00, 0.025, L);

  float yBase = -0.42;

  for(int i=0;i<N;i++){
    float k = float(i) / float(N - 1);
    float mid = bulge(k);

    float s = mix(0.78, 1.28, mid);
    vec2 r = vec2(0.56 * s, 0.082);
    r *= R_SCALE * (1.0 + breathe);

    float y = yBase;
    for(int j=0;j<N;j++){
      if(j == i) break;

      float kk = float(j) / float(N - 1);
      float mm = bulge(kk);

      float step = baseGap + sizeGap * mm;
      step += topExtra * pow(kk, 1.8);

      y += step;
    }

    y -= 0.30;

    float x = 0.005 * sin(t * 1.6 + k * 7.0);

    float bottomFade = mix(0.70, 1.00, smoothstep(0.12, 0.45, k));
    float alpha = mix(0.24, 0.56, mid) * mix(0.70, 1.0, L) * bottomFade;

    float rimPow  = mix(1.25, 2.10, k);
    float glowPow = mix(1.45, 2.10, k);

    vec4 d = disc(p, c + vec2(x, y), r, alpha, rimPow, glowPow);
    acc += d.rgb * d.a * 0.95;
  }

  vec3 mainC = vec3(23.0/255.0, 33.0/255.0, 231.0/255.0);
  float dd = length((p - c) * vec2(1.0, 1.25));
  float haloW = mix(0.62, 0.92, L);
  float halo = exp(-pow(dd / haloW, 2.2)) * mix(0.05, 0.24, L);
  acc += mainC * halo;

  gl_FragColor = vec4(clamp(acc, 0.0, 1.0), 1.0);
}
`;

// --- GL helpers --------------------------------------------
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    log("Shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function link(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    log("Program link failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// --- Component ---------------------------------------------
export default function VoiceEnergyGL({ level01, style }: Props) {
  const levelRef = useRef(level01);
  levelRef.current = level01;

  const rafRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <GLView
      style={[{ flex: 1, backgroundColor: "black" }, style]}
      onContextCreate={(gl) => {
        const g = gl as unknown as WebGLRenderingContext;

        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        const vs = compile(g, g.VERTEX_SHADER, VERT);
        const fs = compile(g, g.FRAGMENT_SHADER, FRAG);

        if (!vs || !fs) {
          gl.endFrameEXP();
          return;
        }

        const program = link(g, vs, fs);
        if (!program) {
          gl.endFrameEXP();
          return;
        }

        g.useProgram(program);

        const quad = g.createBuffer();
        if (!quad) return;

        g.bindBuffer(g.ARRAY_BUFFER, quad);
        g.bufferData(
          g.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          g.STATIC_DRAW,
        );

        const aPos = g.getAttribLocation(program, "a_pos");
        if (aPos < 0) return;

        g.enableVertexAttribArray(aPos);
        g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);

        const uRes = g.getUniformLocation(program, "u_res");
        const uTime = g.getUniformLocation(program, "u_time");
        const uLvl = g.getUniformLocation(program, "u_level");

        if (!uRes || !uTime || !uLvl) return;

        const start = Date.now();

        const render = () => {
          if (!aliveRef.current) return;

          const t = (Date.now() - start) / 1000;

          const w = gl.drawingBufferWidth || 1;
          const h = gl.drawingBufferHeight || 1;

          g.viewport(0, 0, w, h);
          g.uniform2f(uRes, w, h);
          g.uniform1f(uTime, t);
          g.uniform1f(uLvl, Math.max(0, Math.min(1, levelRef.current)));

          g.drawArrays(g.TRIANGLES, 0, 6);
          g.flush();
          gl.endFrameEXP();

          rafRef.current = requestAnimationFrame(render);
        };

        render();
      }}
    />
  );
}
