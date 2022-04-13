import {
  Scene, WebGLRenderer, OrthographicCamera, LineBasicMaterial,
  Vector3, BufferGeometry, Line, PlaneGeometry, ShaderMaterial, Mesh,
  Vector2, FramebufferTexture, RGBAFormat, Color,
  SphereGeometry, MeshBasicMaterial, NoBlending,
} from 'three';

interface Edge {
  startX: number
  startY: number
  endX: number
  endY: number
  line: Line
  lightStrength: number
  lightStartTime: number
}

interface Vertex {
  x: number
  y: number
  start: Vector3
  end: Vector3
  actual: Vector3
  startTime: number
  duration: number
  point: Mesh
  lightStrength: number
  lightStartTime: number
  spread: boolean
  edges: Edge[]
}

export interface StepParameters {
  renderer: WebGLRenderer
  // eslint-disable-next-line no-unused-vars
  randPoint: (x:number, y:number) => Vector3
  getDuration: () => number
  edges: Edge[]
  vertices: Vertex[][]
  camera: OrthographicCamera
  material: ShaderMaterial
  edgeOffset: Vector3
  lineColor: Color
  lightColor: Color
  bufferTexture: { current: FramebufferTexture }
  scene: Scene
  squareSize: number
}

const origin2d = new Vector2(0, 0);
const sphereRadius = 3;
const sphereGeometry = new SphereGeometry(sphereRadius);
const sphereOffset = new Vector3(0, 0, sphereRadius * 2);
const spreadDist = 3;
const spreadTime = 0.25;

export function setupNeurons(
  // clearColor: number,
  lineColor: number,
  lightColor: number,
  squareSize: number,
  wanderingRadius: number,
  minTransitionTime: number,
  maxTransitionTime: number,
  canvas?: HTMLCanvasElement,
):[() => void, StepParameters, HTMLCanvasElement] {
  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0), new Vector3(0, 0, squareSize),
  ]);
  const edgeOffset = new Vector3(wanderingRadius, wanderingRadius, 0);
  const renderer:WebGLRenderer = new WebGLRenderer({
    canvas,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.setSize(
    renderer.domElement.clientWidth,
    renderer.domElement.clientHeight,
    false,
  );
  renderer.setClearAlpha(0);
  // renderer.setClearColor(clearColor, 0);

  const postFXGeometry = new PlaneGeometry(1, 1);
  const postFXMaterial = new ShaderMaterial({
    uniforms: {
      sampler: { value: null },
    },
    vertexShader: `
      varying vec2 v_uv;

      void main () {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        v_uv = uv;
      }
    `,
    fragmentShader: `
      uniform sampler2D sampler;
      varying vec2 v_uv;

      void main () {
        vec4 inputColor = texture2D(sampler, v_uv);
        vec4 outputColor = vec4(inputColor.rgb, inputColor.a - 0.002);
        gl_FragColor = outputColor;
      }
    `,
    transparent: true,
    blending: NoBlending,
  });
  const plane = new Mesh(postFXGeometry, postFXMaterial);

  plane.rotateY(Math.PI);
  plane.rotateZ(Math.PI);

  const scene = new Scene();
  scene.add(plane);

  function randPoint(
    x:number,
    y:number,
  ) {
    const pixelX = x * squareSize;
    const pixelY = y * squareSize;
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(Math.random()) * wanderingRadius;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    return new Vector3(
      pixelX + r * sinPhi * cosTheta,
      pixelY + r * sinPhi * sinTheta,
      r * cosPhi, // z is 0
    );
  }

  function getDuration() {
    return minTransitionTime + Math.random() * (maxTransitionTime - minTransitionTime);
  }

  const generateVertex = (x:number, y:number) => {
    const point = new Mesh(sphereGeometry, new MeshBasicMaterial({ color: lineColor }));
    scene.add(point);
    const startPoint = randPoint(x, y);
    const actual = new Vector3().copy(startPoint).sub(edgeOffset);
    return {
      x,
      y,
      start: startPoint,
      end: randPoint(x, y),
      actual,
      startTime: 0,
      duration: getDuration(),
      point,
      lightStrength: 0,
      lightStartTime: 0,
      spread: false,
      edges: [],
    };
  };

  const edges:Edge[] = [];
  const vertices:Vertex[][] = [[]];

  const drawLine = (
    x:number,
    y:number,
    type:'vertical'|'horizontal'|'diagonal',
  ) => {
    const line = new Line(geometry, new LineBasicMaterial({ color: lineColor }));
    scene.add(line);
    if (type === 'vertical') {
      const edge:Edge = {
        startX: x,
        startY: y,
        endX: x,
        endY: y - 1,
        line,
        lightStrength: 0,
        lightStartTime: 0,
      };
      edges.push(edge);
      vertices[y][x].edges.push(edge);
      vertices[y - 1][x].edges.push(edge);
    } else if (type === 'horizontal') {
      const edge:Edge = {
        startX: x,
        startY: y,
        endX: x - 1,
        endY: y,
        line,
        lightStrength: 0,
        lightStartTime: 0,
      };
      edges.push(edge);
      vertices[y][x].edges.push(edge);
      vertices[y][x - 1].edges.push(edge);
    } else if (type === 'diagonal') {
      if (Math.random() < 0.5) {
        const edge:Edge = {
          startX: x - 1,
          startY: y,
          endX: x,
          endY: y - 1,
          line,
          lightStrength: 0,
          lightStartTime: 0,
        };
        edges.push(edge);
        vertices[y][x - 1].edges.push(edge);
        vertices[y - 1][x].edges.push(edge);
      } else {
        const edge:Edge = {
          startX: x,
          startY: y,
          endX: x - 1,
          endY: y - 1,
          line,
          lightStrength: 0,
          lightStartTime: 0,
        };
        edges.push(edge);
        vertices[y][x].edges.push(edge);
        vertices[y - 1][x - 1].edges.push(edge);
      }
    }
  };

  const camera = new OrthographicCamera();
  camera.left = 0;
  camera.top = 0;
  camera.near = 1;
  camera.far = 1000;
  camera.position.set(0, 0, 100);

  const bufferTexture:{ current: FramebufferTexture } = {
    current: new FramebufferTexture(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
      RGBAFormat,
    ),
  };

  const setup = () => {
    const newTexture = new FramebufferTexture(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
      RGBAFormat,
    );
    renderer.render(scene, camera);
    bufferTexture.current.dispose();
    bufferTexture.current = newTexture;
    plane.position.set(
      renderer.domElement.clientWidth / 2,
      renderer.domElement.clientHeight / 2,
      -wanderingRadius,
    );
    plane.scale.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight, 1);
    if (bufferTexture.current && plane.material instanceof ShaderMaterial) {
      renderer.copyFramebufferToTexture(origin2d, newTexture);
      plane.material.uniforms.sampler.value = newTexture;
    }
    renderer.setSize(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
      false,
    );
    camera.right = renderer.domElement.clientWidth;
    camera.bottom = renderer.domElement.clientHeight;
    camera.updateProjectionMatrix();

    let xCells = vertices[0].length - 1;
    let yCells = vertices.length - 1;

    const xDifference = Math.ceil(
      (renderer.domElement.clientWidth + wanderingRadius * 2) / squareSize,
    ) - xCells;
    if (xDifference > 0) { // needs to be wider
      for (let i = 0; i < xDifference; i += 1) {
        vertices.forEach((verticesRow, index) => {
          verticesRow.push(generateVertex(verticesRow.length, index));
          if (index !== 0) {
            drawLine(verticesRow.length - 2, index, 'vertical');
            if (index !== vertices.length - 1) { // not last row
              drawLine(verticesRow.length - 1, index, 'horizontal');
            }
            drawLine(verticesRow.length - 1, index, 'diagonal');
          }
        });
      }
      xCells = vertices[0].length - 1;
    }

    const yDifference = Math.ceil(
      (renderer.domElement.clientHeight + wanderingRadius * 2) / squareSize,
    ) - yCells;
    if (yDifference > 0) { // needs to be taller
      for (let i = 0; i < yDifference; i += 1) {
        const newRow:Vertex[] = [];
        vertices.push(newRow);
        vertices[vertices.length - 2].forEach((vertex, index) => {
          newRow.push(generateVertex(vertex.x, vertex.y + 1));
          if (index !== 0) {
            drawLine(vertex.x, vertex.y, 'horizontal');
            if (index !== vertices[0].length - 1) { // not last column
              drawLine(vertex.x, vertex.y + 1, 'vertical');
            }
            drawLine(vertex.x, vertex.y + 1, 'diagonal');
          }
        });
      }
      yCells = vertices.length - 1;
    }
  };
  return [setup, {
    renderer,
    randPoint,
    getDuration,
    edges,
    vertices,
    camera,
    material: postFXMaterial,
    edgeOffset,
    lineColor: new Color(lineColor),
    lightColor: new Color(lightColor),
    bufferTexture,
    scene,
    squareSize,
  }, renderer.domElement];
}

export function renderStep(time:number, lightTime: number, {
  renderer,
  randPoint,
  getDuration,
  edges,
  vertices,
  camera,
  material,
  edgeOffset,
  lineColor,
  lightColor,
  bufferTexture,
  scene,
  squareSize,
}: StepParameters) {
  vertices.forEach((verticesRow) => {
    verticesRow.forEach((vertex) => {
      if (time > vertex.startTime + vertex.duration) {
        /* eslint-disable no-param-reassign */
        vertex.startTime += vertex.duration;
        vertex.duration = getDuration();
        vertex.start = vertex.end;
        vertex.end = randPoint(vertex.x, vertex.y);
        if (Math.random() < 0.1) {
          vertex.lightStrength = spreadDist;
          vertex.lightStartTime = vertex.startTime;
        }
        /* eslint-enable no-param-reassign */
      }
      vertex.actual.lerpVectors(
        vertex.start,
        vertex.end,
        (time - vertex.startTime) / vertex.duration,
      ).sub(edgeOffset);
      if (vertex.lightStrength && vertex.point.material instanceof MeshBasicMaterial) {
        const progress = (time - vertex.lightStartTime) / lightTime;
        if (progress < 1) {
          vertex.point.material.color.lerpColors(
            lineColor,
            lightColor,
            (vertex.lightStrength / spreadDist) * (1 - progress),
          );
          if (
            vertex.lightStrength > 1
              && progress > spreadTime
              && !vertex.spread
          ) {
            // eslint-disable-next-line no-param-reassign
            vertex.spread = true;
            const nextLightStrength = vertex.lightStrength - 1;
            const startTime = vertex.lightStartTime + spreadTime * lightTime;
            vertex.edges.forEach((edge) => {
              if (
                edge.line.material instanceof LineBasicMaterial
                  && nextLightStrength >= edge.lightStrength
              ) {
                /* eslint-disable no-param-reassign */
                edge.lightStrength = nextLightStrength;
                edge.lightStartTime = startTime;
                /* eslint-ensable no-param-reassign */
                if (
                  vertex.x === edge.startX
                    && vertex.y === edge.startY
                    && nextLightStrength > vertices[edge.endY][edge.endX]
                      .lightStrength
                ) {
                  vertices[edge.endY][edge.endX].lightStrength = nextLightStrength;
                  vertices[edge.endY][edge.endX].lightStartTime = startTime;
                  vertices[edge.endY][edge.endX].spread = false;
                } else if (
                  nextLightStrength >= vertices[edge.startY][edge.startX]
                    .lightStrength
                ) {
                  vertices[edge.startY][edge.startX]
                    .lightStrength = nextLightStrength;
                  vertices[edge.startY][edge.startX].lightStartTime = startTime;
                  vertices[edge.startY][edge.startX].spread = false;
                }
              }
            });
          }
        } else {
          vertex.point.material.color.set(lineColor);
          /* eslint-disable no-param-reassign */
          vertex.lightStrength = 0;
          vertex.spread = false;
          /* eslint-ensable no-param-reassign */
        }
      }
      vertex.point.position.copy(vertex.actual).add(sphereOffset);
    });
  });
  edges.forEach((edge) => {
    const start = vertices[edge.startY][edge.startX];
    const end = vertices[edge.endY][edge.endX];
    edge.line.position.copy(start.actual);
    edge.line.lookAt(end.actual);
    edge.line.scale.setZ(start.actual.distanceTo(end.actual) / squareSize);
    if (edge.lightStrength && edge.line.material instanceof LineBasicMaterial) {
      const progress = (time - edge.lightStartTime) / lightTime;
      if (progress < 1) {
        edge.line.material.color.lerpColors(
          lineColor,
          lightColor,
          (edge.lightStrength / spreadDist) * (1 - progress),
        );
      } else {
        edge.line.material.color.set(lineColor);
        /* eslint-disable no-param-reassign */
        edge.lightStrength = 0;
        edge.lightStartTime = 0;
        /* eslint-ensable no-param-reassign */
      }
    }
  });
  if (bufferTexture) {
    renderer.render(scene, camera);
    renderer.copyFramebufferToTexture(origin2d, bufferTexture.current);
    material.uniforms.sampler.value = bufferTexture.current;
  }
}
