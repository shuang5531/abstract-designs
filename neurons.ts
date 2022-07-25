import {
  Scene, WebGLRenderer, OrthographicCamera, LineBasicMaterial,
  Vector3, BufferGeometry, Line, PlaneGeometry, ShaderMaterial, Mesh,
  Vector2, FramebufferTexture, RGBAFormat, Color, PerspectiveCamera,
  SphereGeometry, MeshBasicMaterial, NoBlending,
} from 'three';

interface Edge {
  startX: number
  startY: number
  endX: number
  endY: number
  line: Line
  lightStrength: number
  lightTimeLeft: number
}

interface Vertex {
  start: Vector3
  end: Vector3
  actual: Vector3
  offset: Vector3
  duration: number
  timeLeft: number
  point: Mesh
  lightStrength: number
  lightTimeLeft: number
  spread: boolean
  edges: Edge[]
  horizontalChecked?: boolean
  upChecked?: boolean
  downChecked?: boolean
}

export interface StepParameters {
  renderer: WebGLRenderer
  // eslint-disable-next-line no-unused-vars
  randPoint: () => Vector3
  getDuration: () => number
  edges: Edge[]
  vertices: Vertex[][]
  camera: PerspectiveCamera
  fxCamera: OrthographicCamera
  material: ShaderMaterial
  lineColor: Color
  lightColor: Color
  bufferTexture: { current: FramebufferTexture }
  scene: Scene
  fxScene: Scene
  unitSize: number
}

const origin2d = new Vector2(0, 0);
const sphereRadius = 3;
const sphereGeometry = new SphereGeometry(sphereRadius);
const spreadDist = 3;
const spreadTime = 0.75;
const triangleHeight = Math.sqrt(3) / 2;

function degToRad(degrees: number) {
  return degrees * (Math.PI / 180);
}

function calcOffset(xAngle:number, yAngle:number, dist: number):Vector3 {
  return new Vector3(
    dist * Math.sin(xAngle),
    dist * Math.sin(yAngle),
    -dist * Math.cos(xAngle) * Math.cos(yAngle),
  );
}

export function setupNeurons(
  lineColor: number | string,
  lightColor: number | string,
  unitSize: number,
  wanderingRadius: number,
  minTransitionTime: number,
  maxTransitionTime: number,
  options?: {
    canvas?: HTMLCanvasElement,
    designType?: 'grid' | 'triangle',
  },
):[() => void, StepParameters, HTMLCanvasElement] {
  const { canvas, designType } = { designType: 'grid', ...options };
  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0), new Vector3(0, 0, unitSize),
  ]);
  const renderer:WebGLRenderer = new WebGLRenderer({
    canvas,
    antialias: true,
    premultipliedAlpha: false,
    alpha: true,
  });
  renderer.setSize(
    renderer.domElement.clientWidth,
    renderer.domElement.clientHeight,
    false,
  );
  renderer.autoClear = false;
  renderer.setClearAlpha(0);

  const fxScene = new Scene();
  const fxGeometry = new PlaneGeometry(1, 1);
  const fxMaterial = new ShaderMaterial({
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
  const plane = new Mesh(fxGeometry, fxMaterial);
  plane.position.setZ(-1000);

  const scene = new Scene();
  fxScene.add(plane);

  function randPoint() {
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
      r * sinPhi * cosTheta,
      r * sinPhi * sinTheta,
      r * cosPhi, // z is 0
    );
  }

  function getDuration() {
    return minTransitionTime + Math.random() * (maxTransitionTime - minTransitionTime);
  }

  const edges:Edge[] = [];
  const vertices:Vertex[][] = [];

  const camera = new PerspectiveCamera(
    50,
    renderer.domElement.clientWidth / renderer.domElement.clientHeight,
    1,
    5000,
  );

  const fxCamera = new OrthographicCamera(
    -renderer.domElement.clientWidth / 2,
    renderer.domElement.clientWidth / 2,
    renderer.domElement.clientHeight / 2,
    -renderer.domElement.clientHeight / 2,
    1,
    1000,
  );

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
    bufferTexture.current.dispose();
    bufferTexture.current = newTexture;
    plane.scale.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight, 1);
    renderer.setSize(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
      false,
    );
    camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    camera.updateProjectionMatrix();

    fxCamera.left = -renderer.domElement.clientWidth / 2;
    fxCamera.right = renderer.domElement.clientWidth / 2;
    fxCamera.top = renderer.domElement.clientHeight / 2;
    fxCamera.bottom = -renderer.domElement.clientHeight / 2;
    fxCamera.updateProjectionMatrix();

    const anglePerPixel = camera.fov / renderer.domElement.clientHeight;
    const dist = Math.sqrt(1 / (2 - 2 * Math.cos(degToRad(anglePerPixel)))); // law of cosines
    const anglePerSquare = unitSize * anglePerPixel;

    const generateVertex = (offset: Vector3):Vertex => {
      const point = new Mesh(sphereGeometry, new MeshBasicMaterial({ color: lineColor }));
      scene.add(point);
      const startPoint = randPoint();
      const actual = new Vector3().copy(startPoint).add(offset);
      const duration = getDuration();
      return {
        start: startPoint,
        end: randPoint(),
        actual,
        offset,
        duration,
        timeLeft: Math.random() * duration,
        point,
        lightStrength: 0,
        lightTimeLeft: 0,
        spread: false,
        edges: [],
      };
    };

    if (designType === 'grid') {
      const leftAngle = -anglePerPixel * (renderer.domElement.clientWidth / 2 + wanderingRadius);
      const topAngle = anglePerPixel * (renderer.domElement.clientHeight / 2 + wanderingRadius);
      const drawGridLine = (
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
            lightTimeLeft: 0,
          };
          edges.push(edge);
          vertices[x][y].edges.push(edge);
          vertices[x][y - 1].edges.push(edge);
        } else if (type === 'horizontal') {
          const edge:Edge = {
            startX: x,
            startY: y,
            endX: x - 1,
            endY: y,
            line,
            lightStrength: 0,
            lightTimeLeft: 0,
          };
          edges.push(edge);
          vertices[x][y].edges.push(edge);
          vertices[x - 1][y].edges.push(edge);
        } else if (type === 'diagonal') {
          if (Math.random() < 0.5) {
            const edge:Edge = {
              startX: x - 1,
              startY: y,
              endX: x,
              endY: y - 1,
              line,
              lightStrength: 0,
              lightTimeLeft: 0,
            };
            edges.push(edge);
            vertices[x - 1][y].edges.push(edge);
            vertices[x][y - 1].edges.push(edge);
          } else {
            const edge:Edge = {
              startX: x,
              startY: y,
              endX: x - 1,
              endY: y - 1,
              line,
              lightStrength: 0,
              lightTimeLeft: 0,
            };
            edges.push(edge);
            vertices[x][y].edges.push(edge);
            vertices[x - 1][y - 1].edges.push(edge);
          }
        }
      };

      const calcGridOffset = (x:number, y:number):Vector3 => {
        const horizontalAngle = degToRad(leftAngle + x * anglePerSquare);
        const verticalAngle = degToRad(topAngle - y * anglePerSquare);
        return calcOffset(horizontalAngle, verticalAngle, dist);
      };
      const minXVertices = Math.ceil(
        (renderer.domElement.clientWidth + wanderingRadius * 2) / unitSize,
      ) + 1; // +1 for fencepost
      const minYVertices = Math.ceil(
        (renderer.domElement.clientHeight + wanderingRadius * 2) / unitSize,
      ) + 1; // +1 for fencepost
      for (let x = 0; x < Math.max(minXVertices, vertices.length); x += 1) {
        if (!vertices[x]) {
          vertices.push([]);
        }
        for (let y = 0; y < Math.max(minYVertices, (vertices[0] || []).length); y += 1) {
          if (vertices[x][y]) {
            vertices[x][y].offset.copy(calcGridOffset(x, y));
          } else {
            vertices[x].push(generateVertex(calcGridOffset(x, y)));
            if (x !== 0 && y !== 0) { // not first column or row
              if (y !== 1) { // not second row
                drawGridLine(x, y - 1, 'horizontal');
              }
              if (x !== 1) { // not second column
                drawGridLine(x - 1, y, 'vertical');
              }
              drawGridLine(x, y, 'diagonal');
            }
          }
        }
      }
    } else if (designType === 'triangle') {
      const leftAngle = -anglePerPixel * (
        (renderer.domElement.clientWidth + unitSize) / 2 + wanderingRadius
      );
      const topAngle = anglePerPixel * (renderer.domElement.clientHeight / 2 + wanderingRadius);
      // like this: /_\/_\/_\/_\/_\
      const minXSections = Math.ceil(
        (renderer.domElement.clientWidth + wanderingRadius * 2) / (unitSize / 2),
      ) + 3; // +1 on left side, +1 on right side, +1 for fencepost
      const minYSections = Math.ceil(
        (renderer.domElement.clientHeight + wanderingRadius * 2) / triangleHeight / unitSize,
      ) + 1; // +1 for fencepost

      const drawTriangleLine = (
        x:number,
        y:number,
        type:'up' | 'down' | 'horizontal',
      ) => {
        const line = new Line(geometry, new LineBasicMaterial({ color: lineColor }));
        scene.add(line);
        if (type === 'horizontal') {
          const edge:Edge = {
            startX: x,
            startY: y,
            endX: x - 2,
            endY: y,
            line,
            lightStrength: 0,
            lightTimeLeft: 0,
          };
          edges.push(edge);
          vertices[x][y].horizontalChecked = true;
          vertices[x][y].edges.push(edge);
          vertices[x - 2][y].edges.push(edge);
        } else {
          // odd and up: 0
          // even and up: -1
          // odd and down: +1
          // even and down: 0
          let endY = y - 1; // type is 'up' and row is even
          let check:'upChecked'|'downChecked' = 'upChecked';
          if (x % 2 === 0) { // odd rows
            endY += 1;
          }
          if (type === 'down') {
            endY += 1;
            check = 'downChecked';
          }
          const edge:Edge = {
            startX: x,
            startY: y,
            endX: x - 1,
            endY,
            line,
            lightStrength: 0,
            lightTimeLeft: 0,
          };
          edges.push(edge);
          vertices[x][y][check] = true;
          vertices[x][y].edges.push(edge);
          vertices[x - 1][endY].edges.push(edge);
        }
      };

      const calcTriangleOffset = (x:number, y:number):Vector3 => {
        const horizontalAngle = degToRad(leftAngle + (x / 2) * anglePerSquare);
        if (x % 2 === 0) { // odd rows
          const verticalAngle = degToRad(
            topAngle - (y + 0.5) * 2 * triangleHeight * anglePerSquare,
          );
          return calcOffset(horizontalAngle, verticalAngle, dist);
        } // even rows
        const verticalAngle = degToRad(
          topAngle - y * 2 * triangleHeight * anglePerSquare,
        );
        return calcOffset(horizontalAngle, verticalAngle, dist);
      };

      for (let x = 0; x < Math.max(minXSections, vertices.length); x += 1) {
        if (!vertices[x]) {
          vertices.push([]);
        }
        for (
          let sectionY = 0;
          sectionY < Math.max(minYSections, vertices[0].length + (vertices[1] || []).length);
          sectionY += 1
        ) {
          const y = Math.floor(sectionY / 2);
          if (
            (x % 2 === 0 && sectionY % 2 === 1) // row is on odds and current row is odd
            || (x % 2 === 1 && sectionY % 2 === 0) // row is on evens and current row is even
          ) {
            if (vertices[x][y]) {
              vertices[x][y].offset.copy(calcTriangleOffset(x, y));
            } else {
              vertices[x].push(generateVertex(calcTriangleOffset(x, y)));
            }
          } else if (x > 1) { // off vertex checks, nothing to run on x = 0 or 1
            const prevY = Math.floor((sectionY - 1) / 2);
            if (sectionY > 1 && !vertices[x][prevY].horizontalChecked) {
              drawTriangleLine(x, prevY, 'horizontal');
            }
            if (sectionY > 0 && !vertices[x - 1][y].upChecked) {
              drawTriangleLine(x - 1, y, 'up');
            }
            if (sectionY < minYSections - 1 && !vertices[x - 1][y].downChecked) {
              drawTriangleLine(x - 1, y, 'down');
            }
          }
        }
      }
    }
  };

  return [setup, {
    renderer,
    randPoint,
    getDuration,
    edges,
    vertices,
    camera,
    fxCamera,
    material: fxMaterial,
    lineColor: new Color(lineColor),
    lightColor: new Color(lightColor),
    bufferTexture,
    scene,
    fxScene,
    unitSize,
  }, renderer.domElement];
}

export function renderStep(delta:number, lightTime: number, {
  renderer,
  randPoint,
  getDuration,
  edges,
  vertices,
  camera,
  fxCamera,
  material,
  lineColor,
  lightColor,
  bufferTexture,
  scene,
  fxScene,
  unitSize,
}: StepParameters) {
  vertices.forEach((verticesRow, x) => {
    verticesRow.forEach((vertex, y) => {
      // eslint-disable-next-line no-param-reassign
      vertex.timeLeft -= delta;
      if (vertex.timeLeft < 0) {
        /* eslint-disable no-param-reassign */
        if (Math.random() < 0.5) { // frequency
          vertex.lightStrength = spreadDist;
          // delta will get removed immediately
          vertex.lightTimeLeft = vertex.timeLeft + lightTime + delta;
        }
        vertex.duration = getDuration();
        vertex.timeLeft += vertex.duration;
        vertex.start = vertex.end;
        vertex.end = randPoint();
        /* eslint-enable no-param-reassign */
      }
      vertex.actual.lerpVectors(
        vertex.end,
        vertex.start,
        vertex.timeLeft / vertex.duration,
      ).add(vertex.offset);
      // light vertex
      if (vertex.lightStrength && vertex.point.material instanceof MeshBasicMaterial) {
        // eslint-disable-next-line no-param-reassign
        vertex.lightTimeLeft -= delta;
        const countdown = vertex.lightTimeLeft / lightTime; // 1 to 0
        if (countdown > 0) { // control rounding errors
          vertex.point.material.color.lerpColors(
            lineColor,
            lightColor,
            (vertex.lightStrength / spreadDist) * countdown,
          );
          if (
            vertex.lightStrength > 1 // strong enough to spread
              && countdown < spreadTime // should spread
              && !vertex.spread // hasn't spread yet
          ) {
            // eslint-disable-next-line no-param-reassign
            vertex.spread = true;
            const nextLightStrength = vertex.lightStrength - 1;
            const lightTimeLeft = lightTime - (
              spreadTime * lightTime - vertex.lightTimeLeft
            ) + delta;
            vertex.edges.forEach((edge) => {
              if (
                edge.line.material instanceof LineBasicMaterial
                  && nextLightStrength >= edge.lightStrength
              ) {
                /* eslint-disable no-param-reassign */
                edge.lightStrength = nextLightStrength;
                edge.lightTimeLeft = lightTimeLeft;
                /* eslint-ensable no-param-reassign */
                if (
                  x === edge.startX
                  && y === edge.startY
                  && nextLightStrength > vertices[edge.endX][edge.endY]
                    .lightStrength
                ) {
                  vertices[edge.endX][edge.endY].lightStrength = nextLightStrength;
                  vertices[edge.endX][edge.endY].lightTimeLeft = lightTimeLeft;
                  vertices[edge.endX][edge.endY].spread = false;
                } else if (
                  nextLightStrength >= vertices[edge.startX][edge.startY]
                    .lightStrength
                ) {
                  vertices[edge.startX][edge.startY]
                    .lightStrength = nextLightStrength;
                  vertices[edge.startX][edge.startY].lightTimeLeft = lightTimeLeft;
                  vertices[edge.startX][edge.startY].spread = false;
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
      vertex.point.position.copy(vertex.actual);
    });
  });
  edges.forEach((edge) => {
    const start = vertices[edge.startX][edge.startY];
    const end = vertices[edge.endX][edge.endY];
    edge.line.position.copy(start.actual);
    edge.line.lookAt(end.actual);
    edge.line.scale.setZ(start.actual.distanceTo(end.actual) / unitSize);
    if (edge.lightStrength && edge.line.material instanceof LineBasicMaterial) {
      // eslint-disable-next-line no-undef
      edge.lightTimeLeft -= delta;
      const countdown = edge.lightTimeLeft / lightTime;
      if (countdown > 0) {
        edge.line.material.color.lerpColors(
          lineColor,
          lightColor,
          (edge.lightStrength / spreadDist) * countdown,
        );
      } else {
        edge.line.material.color.set(lineColor);
        /* eslint-disable no-param-reassign */
        edge.lightStrength = 0;
        edge.lightTimeLeft = 0;
        /* eslint-ensable no-param-reassign */
      }
    }
  });
  if (bufferTexture) {
    renderer.clear();
    renderer.render(fxScene, fxCamera);
    renderer.render(scene, camera);
    renderer.copyFramebufferToTexture(origin2d, bufferTexture.current);
    material.uniforms.sampler.value = bufferTexture.current;
  }
}
