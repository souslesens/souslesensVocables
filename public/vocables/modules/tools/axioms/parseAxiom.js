var x =
    " <https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess>" +
    " SubClassOf: ( <https://spec.industrialontologies.org/ontology/core/Core/prescribedBy> some (<https://spec.industrialontologies.org/ontology/core/Core/PlanSpecification> and ( <http://purl.obolibrary.org/obo/BFO_0000110> some (<https://spec.industrialontologies.org/ontology/core/Core/ObjectiveSpecification> and (<http://purl.obolibrary.org/obo/BFO_0000084> some <https://spec.industrialontologies.org/ontology/core/Core/BusinessOrganization>)))))";

//var x="<https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess> subClassOf: (<http://purl.obolibrary.org/obo/BFO_0000054> only <https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess>)"

var regex =
    /\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\)/gm;

var groups = regex.exec("(" + x + ")");

var triples = [];

var previousItem = "";
groups.forEach(function (item, index) {
    if (item) {
        if (index < groups.length - 1) {
            item = item.replace(groups[index + 1], "");
        }
        item = item.replace("(", "").replace(")", "");
        item = item.trim().split(" ");
        triples.push(item);
    }
});

var y = triples;
