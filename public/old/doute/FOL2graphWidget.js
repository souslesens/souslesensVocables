//FOL2graphWidget=(function() {

var self = {};
var samples = [
    "Manufacturer(x) ↔ Organization(x) ∧ ∃r(ManufacturerRole(r) ∧ hasRole(x,r))",
    "MaterialArtifact(x) ↔ Object(x) ∧ ∃f,∃d(Function(f) ∧ DesignSpecification(d) ∧ bearerOf(x,f) ∧ prescribes(d,f))",
    "MaterialComponent(x) ↔ MaterialEntity(x) ∧ ∃r(MaterialComponentRole(r) ∧ hasRole(x,r))",
    "MaterialProduct(x) ↔ MaterialEntity(x) ∧ ∃r(MaterialProductRole(r) ∧ hasRole(x,r))",
    "MaterialResource(x) ↔ MaterialEntity(x) ∧ ∃r(MaterialResourceRole(r) ∧ hasRole(x,r))",
    "MeasuredValueSpecification(x) ↔ ValueExpression(x) ∧ ∃e((TemporalRegion(e) ∨ ProcessCharacteristic(e) ∨ SpecificallyDependentContinuant(e)) ∧ isMeasuredValueOfAtSomeTime(x,e))",
];

var parse = function (text) {
    text = samples[5];

    var array = text.split(/[↔∨∧∃]/);

    var regex = /(?<resource>[A-z]+)(?<varName>\(*[a-z,]*\)*) *(?<operator>[↔∨∧∃]*)/gm;

    var members = [];
    var array2 = [];
    while ((array2 = regex.exec(text)) != null) {
        members.push(array2.groups);
    }
    var x = members;
};

//export default FOL2graphWidget;

//window.FOL2graphWidget=FOL2graphWidget

parse();
