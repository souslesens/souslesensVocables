var SkosConceptEditor=(function(){

    var self={context:{
           conceptData:[]

        }}










        var currentEditorDivId= null;
        self.editConcept= function ( editorDivId,conceptData, options) {
            if (editorDivId)
                currentEditorDivId = editorDivId;
            else
                editorDivId = currentEditorDivId;

            if (!conceptData)
                return $("#" + editorDivId).html("");
            if (!options)
                options = {};

            self.context.conceptData = conceptData
           // self.context.currentState = "toForm"


            function setAbout(conceptData) {
                var html = "<div class='concept-group' style='background-color: #b8d6a2'>" +
                    "  <div class='row'>" +
                    "    <div class='col-sm-3'>" +
                    "       <label for='concept_about_value'><h6>about</h6></label> " +
                    "    </div>" +
                    "    <div class='col-lg'>" +
                    "      <input class ='concept_input' id='concept_about_value' value='" + conceptData.id + "' size='70'>" +
                    "   </div>" +
                    "</div>" +
                    "</div>"
                return html;
            }

            function setDefinitions(conceptData) {
                var html = "   <div class='concept-group' style='background-color:#5da9261c'> <h6><span class='title'> Definition</span> <button  class='concept_button' onclick='skosEditor.conceptEditor.addToConceptDefinitions()'>+</button> </h6>"
                conceptData.definitions.forEach(function (definition, index) {
                    html += "  <div class='row'>" +

                        "    <div class='col-lg'>" +
                        "      <textarea class ='concept_input' id='concept_definition_value_" + index + "'  cols='70', rows='3'>" + definition + "</textarea>" +

                        "   </div>" +
                        "<div class='col'>" +
                        "       <button  class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('definitions'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                })
                html += "</div>"
                return html;
            }

            function setNotes(conceptData) {
                var html = "   <div class='concept-group' style='background-color:#5da9261c'> <h6><span class='title'> Notes</span> <button  class='concept_button' onclick='skosEditor.conceptEditor.addToConceptNotes()'>+</button> </h6>"
                conceptData.notes.forEach(function (note, index) {
                    html += "  <div class='row'>" +
                        "    <div class='col-lg'>" +
                        "      <textarea class ='concept_input' id='concept_note_value_" + index + "'  cols='70', rows='3'>" + note + "</textarea>" +

                        "   </div>" +
                        "<div class='col'>" +
                        "       <button  class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('notes'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                })
                html += "</div>"
                return html;
            }


            function setPrefLabels(conceptData) {
                var html = "   <div class='concept-group' style='background-color:#b8d6a2'> <h6><span class='title'> prefLabels</span> <button  class='concept_button' onclick='skosEditor.conceptEditor.addToConceptPrefLabels(true)'>+</button> </h6>"
                conceptData.prefLabels.forEach(function (prefLabel, index) {
                    html += "<div class='container concept-item' >"

                    html += "  <div class='row'>" +

                        "    <div class='col'>" +
                        "      <input class ='concept_input'  id='concept_prefLabel_lang_" + index + "' value='" + prefLabel.lang + "' size='5'>" +
                        "   </div>" +


                        "    <div class='col'>" +
                        "      <input   class ='concept_input'  id='concept_prefLabel_value_" + index + "' value='" + prefLabel.value + "' size='50'>" +
                        "   </div>" +
                        "    <div class='col'>" +
                        "       <button   class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('prefLabels'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                    html += "</div>"
                })
                html += "</div>"
                return html;
            }

            function setAltLabels(conceptData) {

                var html = "   <div class='concept-group' style='background-color:#5da9261c'> <h6><span class='title'> altLabels</span> <button   class='concept_button' onclick='skosEditor.conceptEditor.addToConceptAltLabels()'>+</button></h6> "
                conceptData.altLabels.forEach(function (altLabel, index) {
                    html += "<div class='container concept-item' >"

                    html += "  <div class='row'>" +

                        "    <div class='col'>" +
                        "      <input class ='concept_input' id='concept_altLabel_lang_" + index + "' value='" + altLabel.lang + "' size='5'>" +
                        "   </div>" +

                        "    <div class='col'>" +
                        "      <input class ='concept_input'   id='concept_altLabel_value_" + index + "' value='" + altLabel.value + "' size='50'>" +
                        "   </div>" +

                        "    <div class='col'>" +
                        "       <button   class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('altLabels'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                    html += "</div>"

                })
                html += "</div>"

                return html;
            }

            function setRelated(conceptData) {
                var html = "   <div class='concept-group' style='background-color:#5da9261c'> <h6><span class='title'> related</span> <button   class='concept_button' onclick='skosEditor.conceptEditor.addToConceptRelateds()'>+</button></h6> "
                conceptData.relateds.forEach(function (related, index) {
                    html += "<div class='container concept-item' >"

                    html += "  <div class='row'>" +
                        "    <div class='col'>" +
                        "      <input  class ='concept_input' id='concept_related_" + index + "' value='" + related + "' size='50'>" +
                        "   </div>" +

                        "    <div class='col'>" +
                        "       <button  class ='concept_input'  class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('relateds'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                    html += "</div>"
                })


                html += "</div>"
                return html;
            }


            function setBroaders(conceptData) {
                var html = "   <div class='concept-group' style='background-color:#5da9261c'><h6> <span class='title'> broader</span> <button   class='concept_button' onclick='skosEditor.conceptEditor.addToConceptBroaders()'>+</button></h6> "
                conceptData.broaders.forEach(function (broader, index) {
                    html += "<div class='container concept-item' >"

                    html += "  <div class='row'>" +
                        "    <div class='col'>" +
                        "      <input class ='concept_input' id='concept_broader_" + index + "' value='" + broader + "' size='70'>" +
                        "   </div>" +
                        "    <div class='col'>" +
                        "       <button  class='concept_button' onclick=skosEditor.conceptEditor.removeFromConcept('broaders'," + index + ")> -</button>" +
                        "    </div>" +
                        "</div>"
                    html += "</div>"
                })


                html += "</div>"
                return html;
            }


            var html = "<div class='concept'>"
            //    html += "<form name='conceptDetails'>"
            html += setAbout(conceptData);
            html += setPrefLabels(conceptData);
            html += setDefinitions(conceptData);
            html += setNotes(conceptData);
            html += setAltLabels(conceptData);
            html += setBroaders(conceptData);
            html += setRelated(conceptData);

            html += "</div>"
            //     html += "</form>";


            $("#" + editorDivId).html(html);
            if (options.readOnly) {
                $(".concept_button").css("display", "none")
            }
            if (options.bgColor) {
                $("#" + editorDivId + " .concept-group").css("background-color", options.bgColor);

            }


            $('.concept_input').bind("blur", function (a, b, c) {

                var value = $(this).val();
                var id = $(this).attr("id");

                if (id && id.indexOf("concept_") > -1) {
                    var array = id.split("_");
                    var property = array[2]
                    var index = -1;//valeurs simples
                    if (array.length == 4)
                        var index = parseInt(array[3])//tableaux

                    var type = array[1]
                    if (type == "about")
                        conceptData.id = value;
                    if (type == "altLabel") {
                        conceptData.altLabels[index][property] = value;
                    }
                    if (type == "prefLabel") {
                        conceptData.prefLabels[index][property] = value;
                    }
                    if (type == "related")
                        conceptData.relateds[index] = value;
                    if (type == "broader")
                        conceptData.broaders[index] = value;
                    if (type == "definition")
                        conceptData.definitions[index] = value;
                    if (type == "note")
                        conceptData.notes[index] = value;
                }

                skosEditor.context.editingNode.data = conceptData;
                skosEditor.synchronizeEditorData(skosEditor.context.editingNode);

            })
            //  $( ".concept_button").unbind( "click" );


        }



        self.addToConceptPrefLabels= function () {
            self.context.conceptData.prefLabels.splice(0, 0, {lang: self.outputLang, value: ""})
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);

        }
    self.addToConceptAltLabels= function () {
            self.context.conceptData.altLabels.splice(0, 0, {lang: self.outputLang, value: ""})
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }
    self.addToConceptBroaders=function () {

            self.context.conceptData.broaders.splice(0, 0, "")
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }

        self.addToConceptRelateds= function () {

            self.context.conceptData.relateds.splice(0, 0, "")
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }
    self.addToConceptDefinitions= function () {

            self.context.conceptData.definitions.splice(0, 0, "")
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }

    self.addToConceptNotes= function () {

            self.context.conceptData.notes.splice(0, 0, "")
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }



        self.removeFromConcept= function (type, index) {

            self.context.conceptData[type].splice(index, 1)
            var conceptData = self.context.conceptData
            self.conceptEditor.editConcept(conceptData);
        }



    self.getConceptData =function () {
            var conceptData = {about: "", prefLabels: [], altLabels: [], broaders: [], altLabels: [], relateds: [], definitions: [], notes: []}
            $("input").each(function (a, b) {
                var id = $(this).attr("id")

                var value = $(this).val()
                if (id && id.indexOf("concept_") > -1) {
                    var array = id.split("_");
                    var type = array[1]
                    if (type == "about")
                        conceptData.id = value;
                    if (type == "altLabel") {
                        conceptData.altLabels.push(value);
                    }
                    if (type == "prefLabel") {
                        conceptData.prefLabels.push(value);
                    }
                    if (type == "related")
                        conceptData.relateds.push(value);
                    if (type == "broader")
                        conceptData.broaders.push(value);
                    if (type == "definition")
                        conceptData.definitions.push(value);
                    if (type == "note")
                        conceptData.notes.push(value);

                }


            })
            var altLabels = []
            var lang = "";
            if (conceptData.altLabels)
                conceptData.altLabels.forEach(function (item, index) {
                    if (index % 2 == 0) {
                        lang = item;
                    } else {
                        altLabels.push({lang: lang, value: item})
                    }
                })
            conceptData.altLabels = altLabels;


            var prefLabels = []
            var lang = ""
            if (conceptData.prefLabels)
                conceptData.prefLabels.forEach(function (item, index) {
                    if (index % 2 == 0) {
                        lang = item;
                    } else {
                        prefLabels.push({lang: lang, value: item})
                    }
                })
            conceptData.prefLabels = prefLabels;
            skosEditor.context.modified = true;
            return conceptData;


        }















    return self;





})()
