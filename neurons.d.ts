import { Scene, WebGLRenderer, OrthographicCamera, Vector3, Line, ShaderMaterial, Mesh, FramebufferTexture, Color, PerspectiveCamera } from 'three';
interface Edge {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    line: Line;
    lightStrength: number;
    lightTimeLeft: number;
}
interface Vertex {
    start: Vector3;
    end: Vector3;
    actual: Vector3;
    offset: Vector3;
    duration: number;
    timeLeft: number;
    point: Mesh;
    lightStrength: number;
    lightTimeLeft: number;
    spread: boolean;
    edges: Edge[];
    horizontalChecked?: boolean;
    upChecked?: boolean;
    downChecked?: boolean;
}
export interface StepParameters {
    renderer: WebGLRenderer;
    randPoint: () => Vector3;
    getDuration: () => number;
    edges: Edge[];
    vertices: Vertex[][];
    camera: PerspectiveCamera;
    fxCamera: OrthographicCamera;
    material: ShaderMaterial;
    lineColor: Color;
    lightColor: Color;
    bufferTexture: {
        current: FramebufferTexture;
    };
    scene: Scene;
    fxScene: Scene;
    unitSize: number;
}
export declare function setupNeurons(lineColor: number, lightColor: number, unitSize: number, wanderingRadius: number, minTransitionTime: number, maxTransitionTime: number, options?: {
    canvas?: HTMLCanvasElement;
    designType?: 'grid' | 'triangle';
}): [() => void, StepParameters, HTMLCanvasElement];
export declare function renderStep(delta: number, lightTime: number, { renderer, randPoint, getDuration, edges, vertices, camera, fxCamera, material, lineColor, lightColor, bufferTexture, scene, fxScene, unitSize, }: StepParameters): void;
export {};
