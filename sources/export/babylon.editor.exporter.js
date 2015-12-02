var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            /**
            * Constructor
            */
            function Exporter(core) {
                // private members
                this._window = null;
                this._editor = null;
                this._editorID = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";
                this._generatedCode = "";
                // Initialize
                this.core = core;
            }
            // Opens the scene exporter
            Exporter.prototype.openSceneExporter = function () {
                // Create window
                var windowBody = EDITOR.GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");
                this._window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
                this._window.buttons = ["Generate", "Cancel"];
                this._window.buildElement(null);
                // Create ace editor
                this._editor = ace.edit(this._editorID);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Finish
                this._generatedCode = this._generateCode();
            };
            // Generates the code
            Exporter.prototype._generateCode = function () {
                var scene = this.core.currentScene;
                var finalString = [
                    "var getTextureByName = " + this._getTextureByName + "\n",
                    "function CreateBabylonScene(scene) {",
                    "\tvar engine = scene.getEngine();",
                    "\tvar node = null;\n",
                    this._exportReflectionProbes(),
                    this._traverseNodes(),
                    "}\n"
                ].join("\n");
                this._editor.setValue(finalString, -1);
                return finalString;
            };
            // Export reflection probes
            Exporter.prototype._exportReflectionProbes = function () {
                var scene = this.core.currentScene;
                var finalString = "\t// Export reflection probes\n";
                finalString += "\t var reflectionProbe = null;";
                var t = new BABYLON.ReflectionProbe("", 512, scene, false);
                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    var texture = rp.cubeTexture;
                    if (rp.name === "")
                        continue;
                    finalString = "\treflectionProbe = new BABYLON.ReflectionProbe(\"" + rp.name + "\", " + texture.getSize().width + ", scene, " + texture._generateMipMaps + ");\n";
                    // Render list
                    for (var j = 0; j < rp.renderList.length; j++) {
                        var node = rp.renderList[j];
                        finalString += "\treflectionProbe.renderList.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                    }
                }
                return finalString;
            };
            // Export node's transformation
            Exporter.prototype._exportNodeTransform = function (node) {
                var finalString = "";
                if (node.position) {
                    finalString += "\tnode.position = " + this._exportVector3(node.position) + ";\n";
                }
                if (node.rotation) {
                    finalString += "\tnode.rotation = " + this._exportVector3(node.rotation) + ";\n";
                }
                if (node.rotationQuaternion) {
                    finalString += "\tnode.rotationQuaternion = " + this._exportQuaternion(node.rotationQuaternion) + ";\n";
                }
                if (node.scaling) {
                    finalString += "\tnode.scaling = " + this._exportVector3(node.scaling) + ";\n";
                }
                return finalString;
            };
            // Returns a BaseTexture from its name
            Exporter.prototype._getTextureByName = function (name, scene) {
                // "this" is forbidden since this code is exported directly
                for (var i = 0; i < scene.textures.length; i++) {
                    var texture = scene.textures[i];
                    if (texture.name === name) {
                        return texture;
                    }
                }
                return null;
            };
            // Export node's material
            Exporter.prototype._exportNodeMaterial = function (node) {
                var finalString = "\n";
                var material = node.material;
                if (!material)
                    return finalString;
                // Set constructor
                if (material instanceof BABYLON.StandardMaterial) {
                    finalString += "\tnode.material = new BABYLON.StandardMaterial(\"" + material.name + "\", scene);\n";
                }
                else if (material instanceof BABYLON.PBRMaterial) {
                    finalString += "\tnode.material = new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
                }
                // Set values
                for (var thing in material) {
                    var value = material[thing];
                    var result = "";
                    if (thing[0] === "_")
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.BaseTexture) {
                        result += "getTextureByName(\"" + value.name + "\", scene)";
                    }
                    else
                        continue;
                    finalString += "\tnode.material." + thing + " = " + result + ";\n";
                }
                return finalString + "\n";
            };
            // Exports a BABYLON.Vector2
            Exporter.prototype._exportVector2 = function (vector) {
                return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
            };
            // Exports a BABYLON.Vector3
            Exporter.prototype._exportVector3 = function (vector) {
                return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
            };
            // Exports a BABYLON.Quaternion
            Exporter.prototype._exportQuaternion = function (quaternion) {
                return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
            };
            // Exports a BABYLON.Color3
            Exporter.prototype._exportColor3 = function (color) {
                return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
            };
            // Exports a BABYLON.Color4
            Exporter.prototype._exportColor4 = function (color) {
                return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
            };
            // Traverses nodes
            Exporter.prototype._traverseNodes = function (node) {
                var scene = this.core.currentScene;
                if (!node) {
                    var rootNodes = [];
                    var finalString = "";
                    this._fillRootNodes(rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        finalString += this._traverseNodes(rootNodes[i]);
                    }
                    return finalString;
                }
                else {
                    var finalString = "";
                    if (node.id.indexOf(EDITOR.EditorMain.DummyNodeID) === -1) {
                        finalString = "\t// Configure node " + node.name + "\n";
                        finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";
                        // TODO: Check if node exists.
                        // If not, export geometry and see performances
                        // Transformation
                        finalString += this._exportNodeTransform(node);
                        if (node instanceof BABYLON.AbstractMesh) {
                            // Material
                            finalString += this._exportNodeMaterial(node);
                        }
                    }
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        finalString += this._traverseNodes(node.getDescendants()[i]);
                    }
                    return finalString;
                }
                // Should never happen
                return "";
            };
            // Fills array of root nodes
            Exporter.prototype._fillRootNodes = function (data, propertyPath) {
                var scene = this.core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return Exporter;
        })();
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.exporter.js.map