import { Scene, WebGLRenderer, OrthographicCamera, Vector3, Line, ShaderMaterial, Mesh, FramebufferTexture, Color } from 'three';
interface Edge {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    line: Line;
    lightStrength: number;
    lightStartTime: number;
}
interface Vertex {
    x: number;
    y: number;
    start: Vector3;
    end: Vector3;
    actual: Vector3;
    startTime: number;
    duration: number;
    point: Mesh;
    lightStrength: number;
    lightStartTime: number;
    spread: boolean;
    edges: Edge[];
}
export interface StepParameters {
    renderer: WebGLRenderer;
    randPoint: (x: number, y: number) => Vector3;
    getDuration: () => number;
    edges: Edge[];
    vertices: Vertex[][];
    camera: OrthographicCamera;
    material: ShaderMaterial;
    edgeOffset: Vector3;
    lineColor: Color;
    lightColor: Color;
    bufferTexture: {
        current: FramebufferTexture;
    };
    scene: Scene;
    squareSize: number;
}
export declare function setupNeurons(lineColor: number, lightColor: number, squareSize: number, wanderingRadius: number, minTransitionTime: number, maxTransitionTime: number, canvas?: HTMLCanvasElement): [() => void, StepParameters, HTMLCanvasElement];
export declare function renderStep(time: number, lightTime: number, { renderer, randPoint, getDuration, edges, vertices, camera, material, edgeOffset, lineColor, lightColor, bufferTexture, scene, squareSize, }: StepParameters): void;
export {};
