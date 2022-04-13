"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStep = exports.setupNeurons = void 0;
var three_1 = require("three");
var origin2d = new three_1.Vector2(0, 0);
var sphereRadius = 3;
var sphereGeometry = new three_1.SphereGeometry(sphereRadius);
var sphereOffset = new three_1.Vector3(0, 0, sphereRadius * 2);
var spreadDist = 3;
var spreadTime = 0.25;
function setupNeurons(
// clearColor: number,
lineColor, lightColor, squareSize, wanderingRadius, minTransitionTime, maxTransitionTime, canvas) {
    var geometry = new three_1.BufferGeometry().setFromPoints([
        new three_1.Vector3(0, 0, 0), new three_1.Vector3(0, 0, squareSize),
    ]);
    var edgeOffset = new three_1.Vector3(wanderingRadius, wanderingRadius, 0);
    var renderer = new three_1.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        premultipliedAlpha: false,
    });
    renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
    renderer.setClearAlpha(0);
    // renderer.setClearColor(clearColor, 0);
    var postFXGeometry = new three_1.PlaneGeometry(1, 1);
    var postFXMaterial = new three_1.ShaderMaterial({
        uniforms: {
            sampler: { value: null },
        },
        vertexShader: "\n      varying vec2 v_uv;\n\n      void main () {\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        v_uv = uv;\n      }\n    ",
        fragmentShader: "\n      uniform sampler2D sampler;\n      varying vec2 v_uv;\n\n      void main () {\n        vec4 inputColor = texture2D(sampler, v_uv);\n        vec4 outputColor = vec4(inputColor.rgb, inputColor.a - 0.002);\n        gl_FragColor = outputColor;\n      }\n    ",
        transparent: true,
        blending: three_1.NoBlending,
    });
    var plane = new three_1.Mesh(postFXGeometry, postFXMaterial);
    plane.rotateY(Math.PI);
    plane.rotateZ(Math.PI);
    var scene = new three_1.Scene();
    scene.add(plane);
    function randPoint(x, y) {
        var pixelX = x * squareSize;
        var pixelY = y * squareSize;
        var u = Math.random();
        var v = Math.random();
        var theta = u * 2 * Math.PI;
        var phi = Math.acos(2.0 * v - 1.0);
        var r = Math.cbrt(Math.random()) * wanderingRadius;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);
        return new three_1.Vector3(pixelX + r * sinPhi * cosTheta, pixelY + r * sinPhi * sinTheta, r * cosPhi);
    }
    function getDuration() {
        return minTransitionTime + Math.random() * (maxTransitionTime - minTransitionTime);
    }
    var generateVertex = function (x, y) {
        var point = new three_1.Mesh(sphereGeometry, new three_1.MeshBasicMaterial({ color: lineColor }));
        scene.add(point);
        var startPoint = randPoint(x, y);
        var actual = new three_1.Vector3().copy(startPoint).sub(edgeOffset);
        return {
            x: x,
            y: y,
            start: startPoint,
            end: randPoint(x, y),
            actual: actual,
            startTime: 0,
            duration: getDuration(),
            point: point,
            lightStrength: 0,
            lightStartTime: 0,
            spread: false,
            edges: [],
        };
    };
    var edges = [];
    var vertices = [[]];
    var drawLine = function (x, y, type) {
        var line = new three_1.Line(geometry, new three_1.LineBasicMaterial({ color: lineColor }));
        scene.add(line);
        if (type === 'vertical') {
            var edge = {
                startX: x,
                startY: y,
                endX: x,
                endY: y - 1,
                line: line,
                lightStrength: 0,
                lightStartTime: 0,
            };
            edges.push(edge);
            vertices[y][x].edges.push(edge);
            vertices[y - 1][x].edges.push(edge);
        }
        else if (type === 'horizontal') {
            var edge = {
                startX: x,
                startY: y,
                endX: x - 1,
                endY: y,
                line: line,
                lightStrength: 0,
                lightStartTime: 0,
            };
            edges.push(edge);
            vertices[y][x].edges.push(edge);
            vertices[y][x - 1].edges.push(edge);
        }
        else if (type === 'diagonal') {
            if (Math.random() < 0.5) {
                var edge = {
                    startX: x - 1,
                    startY: y,
                    endX: x,
                    endY: y - 1,
                    line: line,
                    lightStrength: 0,
                    lightStartTime: 0,
                };
                edges.push(edge);
                vertices[y][x - 1].edges.push(edge);
                vertices[y - 1][x].edges.push(edge);
            }
            else {
                var edge = {
                    startX: x,
                    startY: y,
                    endX: x - 1,
                    endY: y - 1,
                    line: line,
                    lightStrength: 0,
                    lightStartTime: 0,
                };
                edges.push(edge);
                vertices[y][x].edges.push(edge);
                vertices[y - 1][x - 1].edges.push(edge);
            }
        }
    };
    var camera = new three_1.OrthographicCamera();
    camera.left = 0;
    camera.top = 0;
    camera.near = 1;
    camera.far = 1000;
    camera.position.set(0, 0, 100);
    var bufferTexture = {
        current: new three_1.FramebufferTexture(renderer.domElement.clientWidth, renderer.domElement.clientHeight, three_1.RGBAFormat),
    };
    var setup = function () {
        var newTexture = new three_1.FramebufferTexture(renderer.domElement.clientWidth, renderer.domElement.clientHeight, three_1.RGBAFormat);
        renderer.render(scene, camera);
        bufferTexture.current.dispose();
        bufferTexture.current = newTexture;
        plane.position.set(renderer.domElement.clientWidth / 2, renderer.domElement.clientHeight / 2, -wanderingRadius);
        plane.scale.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight, 1);
        if (bufferTexture.current && plane.material instanceof three_1.ShaderMaterial) {
            renderer.copyFramebufferToTexture(origin2d, newTexture);
            plane.material.uniforms.sampler.value = newTexture;
        }
        renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
        camera.right = renderer.domElement.clientWidth;
        camera.bottom = renderer.domElement.clientHeight;
        camera.updateProjectionMatrix();
        var xCells = vertices[0].length - 1;
        var yCells = vertices.length - 1;
        var xDifference = Math.ceil((renderer.domElement.clientWidth + wanderingRadius * 2) / squareSize) - xCells;
        if (xDifference > 0) { // needs to be wider
            for (var i = 0; i < xDifference; i += 1) {
                vertices.forEach(function (verticesRow, index) {
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
        var yDifference = Math.ceil((renderer.domElement.clientHeight + wanderingRadius * 2) / squareSize) - yCells;
        if (yDifference > 0) { // needs to be taller
            var _loop_1 = function (i) {
                var newRow = [];
                vertices.push(newRow);
                vertices[vertices.length - 2].forEach(function (vertex, index) {
                    newRow.push(generateVertex(vertex.x, vertex.y + 1));
                    if (index !== 0) {
                        drawLine(vertex.x, vertex.y, 'horizontal');
                        if (index !== vertices[0].length - 1) { // not last column
                            drawLine(vertex.x, vertex.y + 1, 'vertical');
                        }
                        drawLine(vertex.x, vertex.y + 1, 'diagonal');
                    }
                });
            };
            for (var i = 0; i < yDifference; i += 1) {
                _loop_1(i);
            }
            yCells = vertices.length - 1;
        }
    };
    return [setup, {
            renderer: renderer,
            randPoint: randPoint,
            getDuration: getDuration,
            edges: edges,
            vertices: vertices,
            camera: camera,
            material: postFXMaterial,
            edgeOffset: edgeOffset,
            lineColor: new three_1.Color(lineColor),
            lightColor: new three_1.Color(lightColor),
            bufferTexture: bufferTexture,
            scene: scene,
            squareSize: squareSize,
        }, renderer.domElement];
}
exports.setupNeurons = setupNeurons;
function renderStep(time, lightTime, _a) {
    var renderer = _a.renderer, randPoint = _a.randPoint, getDuration = _a.getDuration, edges = _a.edges, vertices = _a.vertices, camera = _a.camera, material = _a.material, edgeOffset = _a.edgeOffset, lineColor = _a.lineColor, lightColor = _a.lightColor, bufferTexture = _a.bufferTexture, scene = _a.scene, squareSize = _a.squareSize;
    vertices.forEach(function (verticesRow) {
        verticesRow.forEach(function (vertex) {
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
            vertex.actual.lerpVectors(vertex.start, vertex.end, (time - vertex.startTime) / vertex.duration).sub(edgeOffset);
            if (vertex.lightStrength && vertex.point.material instanceof three_1.MeshBasicMaterial) {
                var progress = (time - vertex.lightStartTime) / lightTime;
                if (progress < 1) {
                    vertex.point.material.color.lerpColors(lineColor, lightColor, (vertex.lightStrength / spreadDist) * (1 - progress));
                    if (vertex.lightStrength > 1
                        && progress > spreadTime
                        && !vertex.spread) {
                        // eslint-disable-next-line no-param-reassign
                        vertex.spread = true;
                        var nextLightStrength_1 = vertex.lightStrength - 1;
                        var startTime_1 = vertex.lightStartTime + spreadTime * lightTime;
                        vertex.edges.forEach(function (edge) {
                            if (edge.line.material instanceof three_1.LineBasicMaterial
                                && nextLightStrength_1 >= edge.lightStrength) {
                                /* eslint-disable no-param-reassign */
                                edge.lightStrength = nextLightStrength_1;
                                edge.lightStartTime = startTime_1;
                                /* eslint-ensable no-param-reassign */
                                if (vertex.x === edge.startX
                                    && vertex.y === edge.startY
                                    && nextLightStrength_1 > vertices[edge.endY][edge.endX]
                                        .lightStrength) {
                                    vertices[edge.endY][edge.endX].lightStrength = nextLightStrength_1;
                                    vertices[edge.endY][edge.endX].lightStartTime = startTime_1;
                                    vertices[edge.endY][edge.endX].spread = false;
                                }
                                else if (nextLightStrength_1 >= vertices[edge.startY][edge.startX]
                                    .lightStrength) {
                                    vertices[edge.startY][edge.startX]
                                        .lightStrength = nextLightStrength_1;
                                    vertices[edge.startY][edge.startX].lightStartTime = startTime_1;
                                    vertices[edge.startY][edge.startX].spread = false;
                                }
                            }
                        });
                    }
                }
                else {
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
    edges.forEach(function (edge) {
        var start = vertices[edge.startY][edge.startX];
        var end = vertices[edge.endY][edge.endX];
        edge.line.position.copy(start.actual);
        edge.line.lookAt(end.actual);
        edge.line.scale.setZ(start.actual.distanceTo(end.actual) / squareSize);
        if (edge.lightStrength && edge.line.material instanceof three_1.LineBasicMaterial) {
            var progress = (time - edge.lightStartTime) / lightTime;
            if (progress < 1) {
                edge.line.material.color.lerpColors(lineColor, lightColor, (edge.lightStrength / spreadDist) * (1 - progress));
            }
            else {
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
exports.renderStep = renderStep;
