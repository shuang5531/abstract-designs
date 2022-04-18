"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStep = exports.setupNeurons = void 0;
var three_1 = require("three");
var origin2d = new three_1.Vector2(0, 0);
var sphereRadius = 3;
var sphereGeometry = new three_1.SphereGeometry(sphereRadius);
var spreadDist = 3;
var spreadTime = 0.75;
var triangleHeight = Math.sqrt(3) / 2;
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}
function calcOffset(xAngle, yAngle, dist) {
    return new three_1.Vector3(dist * Math.sin(xAngle), dist * Math.sin(yAngle), -dist * Math.cos(xAngle) * Math.cos(yAngle));
}
function setupNeurons(lineColor, lightColor, unitSize, wanderingRadius, minTransitionTime, maxTransitionTime, options) {
    var _a = __assign({ designType: 'grid' }, options), canvas = _a.canvas, designType = _a.designType;
    var geometry = new three_1.BufferGeometry().setFromPoints([
        new three_1.Vector3(0, 0, 0), new three_1.Vector3(0, 0, unitSize),
    ]);
    var renderer = new three_1.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        premultipliedAlpha: false,
        alpha: true,
    });
    renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
    renderer.autoClear = false;
    renderer.setClearAlpha(0);
    var fxScene = new three_1.Scene();
    var fxGeometry = new three_1.PlaneGeometry(1, 1);
    var fxMaterial = new three_1.ShaderMaterial({
        uniforms: {
            sampler: { value: null },
        },
        vertexShader: "\n      varying vec2 v_uv;\n\n      void main () {\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n        v_uv = uv;\n      }\n    ",
        fragmentShader: "\n      uniform sampler2D sampler;\n      varying vec2 v_uv;\n\n      void main () {\n        vec4 inputColor = texture2D(sampler, v_uv);\n        vec4 outputColor = vec4(inputColor.rgb, inputColor.a - 0.002);\n        gl_FragColor = outputColor;\n      }\n    ",
        transparent: true,
        blending: three_1.NoBlending,
    });
    var plane = new three_1.Mesh(fxGeometry, fxMaterial);
    plane.position.setZ(-1000);
    var scene = new three_1.Scene();
    fxScene.add(plane);
    function randPoint() {
        var u = Math.random();
        var v = Math.random();
        var theta = u * 2 * Math.PI;
        var phi = Math.acos(2.0 * v - 1.0);
        var r = Math.cbrt(Math.random()) * wanderingRadius;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);
        return new three_1.Vector3(r * sinPhi * cosTheta, r * sinPhi * sinTheta, r * cosPhi);
    }
    function getDuration() {
        return minTransitionTime + Math.random() * (maxTransitionTime - minTransitionTime);
    }
    var edges = [];
    var vertices = [];
    var camera = new three_1.PerspectiveCamera(50, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 1, 5000);
    var fxCamera = new three_1.OrthographicCamera(-renderer.domElement.clientWidth / 2, renderer.domElement.clientWidth / 2, renderer.domElement.clientHeight / 2, -renderer.domElement.clientHeight / 2, 1, 1000);
    var bufferTexture = {
        current: new three_1.FramebufferTexture(renderer.domElement.clientWidth, renderer.domElement.clientHeight, three_1.RGBAFormat),
    };
    var setup = function () {
        var newTexture = new three_1.FramebufferTexture(renderer.domElement.clientWidth, renderer.domElement.clientHeight, three_1.RGBAFormat);
        bufferTexture.current.dispose();
        bufferTexture.current = newTexture;
        plane.scale.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight, 1);
        renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
        camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
        camera.updateProjectionMatrix();
        fxCamera.left = -renderer.domElement.clientWidth / 2;
        fxCamera.right = renderer.domElement.clientWidth / 2;
        fxCamera.top = renderer.domElement.clientHeight / 2;
        fxCamera.bottom = -renderer.domElement.clientHeight / 2;
        fxCamera.updateProjectionMatrix();
        var anglePerPixel = camera.fov / renderer.domElement.clientHeight;
        var dist = Math.sqrt(1 / (2 - 2 * Math.cos(degToRad(anglePerPixel)))); // law of cosines
        var anglePerSquare = unitSize * anglePerPixel;
        var generateVertex = function (offset) {
            var point = new three_1.Mesh(sphereGeometry, new three_1.MeshBasicMaterial({ color: lineColor }));
            scene.add(point);
            var startPoint = randPoint();
            var actual = new three_1.Vector3().copy(startPoint).add(offset);
            var duration = getDuration();
            return {
                start: startPoint,
                end: randPoint(),
                actual: actual,
                offset: offset,
                duration: duration,
                timeLeft: Math.random() * duration,
                point: point,
                lightStrength: 0,
                lightTimeLeft: 0,
                spread: false,
                edges: [],
            };
        };
        if (designType === 'grid') {
            var leftAngle_1 = -anglePerPixel * (renderer.domElement.clientWidth / 2 + wanderingRadius);
            var topAngle_1 = anglePerPixel * (renderer.domElement.clientHeight / 2 + wanderingRadius);
            var drawGridLine = function (x, y, type) {
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
                        lightTimeLeft: 0,
                    };
                    edges.push(edge);
                    vertices[x][y].edges.push(edge);
                    vertices[x][y - 1].edges.push(edge);
                }
                else if (type === 'horizontal') {
                    var edge = {
                        startX: x,
                        startY: y,
                        endX: x - 1,
                        endY: y,
                        line: line,
                        lightStrength: 0,
                        lightTimeLeft: 0,
                    };
                    edges.push(edge);
                    vertices[x][y].edges.push(edge);
                    vertices[x - 1][y].edges.push(edge);
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
                            lightTimeLeft: 0,
                        };
                        edges.push(edge);
                        vertices[x - 1][y].edges.push(edge);
                        vertices[x][y - 1].edges.push(edge);
                    }
                    else {
                        var edge = {
                            startX: x,
                            startY: y,
                            endX: x - 1,
                            endY: y - 1,
                            line: line,
                            lightStrength: 0,
                            lightTimeLeft: 0,
                        };
                        edges.push(edge);
                        vertices[x][y].edges.push(edge);
                        vertices[x - 1][y - 1].edges.push(edge);
                    }
                }
            };
            var calcGridOffset = function (x, y) {
                var horizontalAngle = degToRad(leftAngle_1 + x * anglePerSquare);
                var verticalAngle = degToRad(topAngle_1 - y * anglePerSquare);
                return calcOffset(horizontalAngle, verticalAngle, dist);
            };
            var minXVertices = Math.ceil((renderer.domElement.clientWidth + wanderingRadius * 2) / unitSize) + 1; // +1 for fencepost
            var minYVertices = Math.ceil((renderer.domElement.clientHeight + wanderingRadius * 2) / unitSize) + 1; // +1 for fencepost
            for (var x = 0; x < Math.max(minXVertices, vertices.length); x += 1) {
                if (!vertices[x]) {
                    vertices.push([]);
                }
                for (var y = 0; y < Math.max(minYVertices, (vertices[0] || []).length); y += 1) {
                    if (vertices[x][y]) {
                        vertices[x][y].offset.copy(calcGridOffset(x, y));
                    }
                    else {
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
        }
        else if (designType === 'triangle') {
            var leftAngle_2 = -anglePerPixel * ((renderer.domElement.clientWidth + unitSize) / 2 + wanderingRadius);
            var topAngle_2 = anglePerPixel * (renderer.domElement.clientHeight / 2 + wanderingRadius);
            // like this: /_\/_\/_\/_\/_\
            var minXSections = Math.ceil((renderer.domElement.clientWidth + wanderingRadius * 2) / (unitSize / 2)) + 3; // +1 on left side, +1 on right side, +1 for fencepost
            var minYSections = Math.ceil((renderer.domElement.clientHeight + wanderingRadius * 2) / triangleHeight / unitSize) + 1; // +1 for fencepost
            var drawTriangleLine = function (x, y, type) {
                var line = new three_1.Line(geometry, new three_1.LineBasicMaterial({ color: lineColor }));
                scene.add(line);
                if (type === 'horizontal') {
                    var edge = {
                        startX: x,
                        startY: y,
                        endX: x - 2,
                        endY: y,
                        line: line,
                        lightStrength: 0,
                        lightTimeLeft: 0,
                    };
                    edges.push(edge);
                    vertices[x][y].horizontalChecked = true;
                    vertices[x][y].edges.push(edge);
                    vertices[x - 2][y].edges.push(edge);
                }
                else {
                    // odd and up: 0
                    // even and up: -1
                    // odd and down: +1
                    // even and down: 0
                    var endY = y - 1; // type is 'up' and row is even
                    var check = 'upChecked';
                    if (x % 2 === 0) { // odd rows
                        endY += 1;
                    }
                    if (type === 'down') {
                        endY += 1;
                        check = 'downChecked';
                    }
                    var edge = {
                        startX: x,
                        startY: y,
                        endX: x - 1,
                        endY: endY,
                        line: line,
                        lightStrength: 0,
                        lightTimeLeft: 0,
                    };
                    edges.push(edge);
                    vertices[x][y][check] = true;
                    vertices[x][y].edges.push(edge);
                    vertices[x - 1][endY].edges.push(edge);
                }
            };
            var calcTriangleOffset = function (x, y) {
                var horizontalAngle = degToRad(leftAngle_2 + (x / 2) * anglePerSquare);
                if (x % 2 === 0) { // odd rows
                    var verticalAngle_1 = degToRad(topAngle_2 - (y + 0.5) * 2 * triangleHeight * anglePerSquare);
                    return calcOffset(horizontalAngle, verticalAngle_1, dist);
                } // even rows
                var verticalAngle = degToRad(topAngle_2 - y * 2 * triangleHeight * anglePerSquare);
                return calcOffset(horizontalAngle, verticalAngle, dist);
            };
            for (var x = 0; x < Math.max(minXSections, vertices.length); x += 1) {
                if (!vertices[x]) {
                    vertices.push([]);
                }
                for (var sectionY = 0; sectionY < Math.max(minYSections, vertices[0].length + (vertices[1] || []).length); sectionY += 1) {
                    var y = Math.floor(sectionY / 2);
                    if ((x % 2 === 0 && sectionY % 2 === 1) // row is on odds and current row is odd
                        || (x % 2 === 1 && sectionY % 2 === 0) // row is on evens and current row is even
                    ) {
                        if (vertices[x][y]) {
                            vertices[x][y].offset.copy(calcTriangleOffset(x, y));
                        }
                        else {
                            vertices[x].push(generateVertex(calcTriangleOffset(x, y)));
                        }
                    }
                    else if (x > 1) { // off vertex checks, nothing to run on x = 0 or 1
                        var prevY = Math.floor((sectionY - 1) / 2);
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
            renderer: renderer,
            randPoint: randPoint,
            getDuration: getDuration,
            edges: edges,
            vertices: vertices,
            camera: camera,
            fxCamera: fxCamera,
            material: fxMaterial,
            lineColor: new three_1.Color(lineColor),
            lightColor: new three_1.Color(lightColor),
            bufferTexture: bufferTexture,
            scene: scene,
            fxScene: fxScene,
            unitSize: unitSize,
        }, renderer.domElement];
}
exports.setupNeurons = setupNeurons;
function renderStep(delta, lightTime, _a) {
    var renderer = _a.renderer, randPoint = _a.randPoint, getDuration = _a.getDuration, edges = _a.edges, vertices = _a.vertices, camera = _a.camera, fxCamera = _a.fxCamera, material = _a.material, lineColor = _a.lineColor, lightColor = _a.lightColor, bufferTexture = _a.bufferTexture, scene = _a.scene, fxScene = _a.fxScene, unitSize = _a.unitSize;
    vertices.forEach(function (verticesRow, x) {
        verticesRow.forEach(function (vertex, y) {
            // eslint-disable-next-line no-param-reassign
            vertex.timeLeft -= delta;
            if (vertex.timeLeft < 0) {
                /* eslint-disable no-param-reassign */
                if (Math.random() < 0.1) {
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
            vertex.actual.lerpVectors(vertex.end, vertex.start, vertex.timeLeft / vertex.duration).add(vertex.offset);
            // light vertex
            if (vertex.lightStrength && vertex.point.material instanceof three_1.MeshBasicMaterial) {
                // eslint-disable-next-line no-param-reassign
                vertex.lightTimeLeft -= delta;
                var countdown = vertex.lightTimeLeft / lightTime; // 1 to 0
                if (countdown > 0) { // control rounding errors
                    vertex.point.material.color.lerpColors(lineColor, lightColor, (vertex.lightStrength / spreadDist) * countdown);
                    if (vertex.lightStrength > 1 // strong enough to spread
                        && countdown < spreadTime // should spread
                        && !vertex.spread // hasn't spread yet
                    ) {
                        // eslint-disable-next-line no-param-reassign
                        vertex.spread = true;
                        var nextLightStrength_1 = vertex.lightStrength - 1;
                        var lightTimeLeft_1 = lightTime - (spreadTime * lightTime - vertex.lightTimeLeft) + delta;
                        vertex.edges.forEach(function (edge) {
                            if (edge.line.material instanceof three_1.LineBasicMaterial
                                && nextLightStrength_1 >= edge.lightStrength) {
                                /* eslint-disable no-param-reassign */
                                edge.lightStrength = nextLightStrength_1;
                                edge.lightTimeLeft = lightTimeLeft_1;
                                /* eslint-ensable no-param-reassign */
                                if (x === edge.startX
                                    && y === edge.startY
                                    && nextLightStrength_1 > vertices[edge.endX][edge.endY]
                                        .lightStrength) {
                                    vertices[edge.endX][edge.endY].lightStrength = nextLightStrength_1;
                                    vertices[edge.endX][edge.endY].lightTimeLeft = lightTimeLeft_1;
                                    vertices[edge.endX][edge.endY].spread = false;
                                }
                                else if (nextLightStrength_1 >= vertices[edge.startX][edge.startY]
                                    .lightStrength) {
                                    vertices[edge.startX][edge.startY]
                                        .lightStrength = nextLightStrength_1;
                                    vertices[edge.startX][edge.startY].lightTimeLeft = lightTimeLeft_1;
                                    vertices[edge.startX][edge.startY].spread = false;
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
            vertex.point.position.copy(vertex.actual);
        });
    });
    edges.forEach(function (edge) {
        var start = vertices[edge.startX][edge.startY];
        var end = vertices[edge.endX][edge.endY];
        edge.line.position.copy(start.actual);
        edge.line.lookAt(end.actual);
        edge.line.scale.setZ(start.actual.distanceTo(end.actual) / unitSize);
        if (edge.lightStrength && edge.line.material instanceof three_1.LineBasicMaterial) {
            // eslint-disable-next-line no-undef
            edge.lightTimeLeft -= delta;
            var countdown = edge.lightTimeLeft / lightTime;
            if (countdown > 0) {
                edge.line.material.color.lerpColors(lineColor, lightColor, (edge.lightStrength / spreadDist) * countdown);
            }
            else {
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
exports.renderStep = renderStep;
