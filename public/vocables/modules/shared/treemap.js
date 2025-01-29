// eslint-disable-next-line @typescript-eslint/no-unused-vars
var TreeMap = (function () {
    var self = {};
    self.flare = {
        name: "flare",
        children: [
            { name: "flare", size: null },
            {
                name: "flare.analytics",
                size: null,
            },
            { name: "flare.analytics.cluster", size: null },
            {
                name: "flare.analytics.cluster.AgglomerativeCluster",
                size: 3938,
            },
            {
                name: "flare.analytics.cluster.CommunityStructure",
                size: 3812,
            },
            {
                name: "flare.analytics.cluster.HierarchicalCluster",
                size: 6714,
            },
            { name: "flare.analytics.cluster.MergeEdge", size: 743 },
            {
                name: "flare.analytics.graph",
                size: null,
            },
            {
                name: "flare.analytics.graph.BetweennessCentrality",
                size: 3534,
            },
            { name: "flare.analytics.graph.LinkDistance", size: 5731 },
            {
                name: "flare.analytics.graph.MaxFlowMinCut",
                size: 7840,
            },
            { name: "flare.analytics.graph.ShortestPaths", size: 5914 },
            {
                name: "flare.analytics.graph.SpanningTree",
                size: 3416,
            },
            {
                name: "flare.analytics.optimization",
                size: null,
            },
            { name: "flare.analytics.optimization.AspectRatioBanker", size: 7074 },
            {
                name: "flare.animate",
                size: null,
            },
            { name: "flare.animate.Easing", size: 17010 },
            {
                name: "flare.animate.FunctionSequence",
                size: 5842,
            },
            { name: "flare.animate.interpolate", size: null },
            {
                name: "flare.animate.interpolate.ArrayInterpolator",
                size: 1983,
            },
            {
                name: "flare.animate.interpolate.ColorInterpolator",
                size: 2047,
            },
            {
                name: "flare.animate.interpolate.DateInterpolator",
                size: 1375,
            },
            {
                name: "flare.animate.interpolate.Interpolator",
                size: 8746,
            },
            {
                name: "flare.animate.interpolate.MatrixInterpolator",
                size: 2202,
            },
            {
                name: "flare.animate.interpolate.NumberInterpolator",
                size: 1382,
            },
            {
                name: "flare.animate.interpolate.ObjectInterpolator",
                size: 1629,
            },
            {
                name: "flare.animate.interpolate.PointInterpolator",
                size: 1675,
            },
            {
                name: "flare.animate.interpolate.RectangleInterpolator",
                size: 2042,
            },
            { name: "flare.animate.ISchedulable", size: 1041 },
            {
                name: "flare.animate.Parallel",
                size: 5176,
            },
            { name: "flare.animate.Pause", size: 449 },
            {
                name: "flare.animate.Scheduler",
                size: 5593,
            },
            { name: "flare.animate.Sequence", size: 5534 },
            {
                name: "flare.animate.Transition",
                size: 9201,
            },
            { name: "flare.animate.Transitioner", size: 19975 },
            {
                name: "flare.animate.TransitionEvent",
                size: 1116,
            },
            { name: "flare.animate.Tween", size: 6006 },
            {
                name: "flare.data",
                size: null,
            },
            { name: "flare.data.converters", size: null },
            {
                name: "flare.data.converters.Converters",
                size: 721,
            },
            {
                name: "flare.data.converters.DelimitedTextConverter",
                size: 4294,
            },
            {
                name: "flare.data.converters.GraphMLConverter",
                size: 9800,
            },
            { name: "flare.data.converters.IDataConverter", size: 1314 },
            {
                name: "flare.data.converters.JSONConverter",
                size: 2220,
            },
            { name: "flare.data.DataField", size: 1759 },
            {
                name: "flare.data.DataSchema",
                size: 2165,
            },
            { name: "flare.data.DataSet", size: 586 },
            {
                name: "flare.data.DataSource",
                size: 3331,
            },
            { name: "flare.data.DataTable", size: 772 },
            {
                name: "flare.data.DataUtil",
                size: 3322,
            },
            { name: "flare.display", size: null },
            {
                name: "flare.display.DirtySprite",
                size: 8833,
            },
            { name: "flare.display.LineSprite", size: 1732 },
            {
                name: "flare.display.RectSprite",
                size: 3623,
            },
            { name: "flare.display.TextSprite", size: 10066 },
            {
                name: "flare.flex",
                size: null,
            },
            { name: "flare.flex.FlareVis", size: 4116 },
            {
                name: "flare.physics",
                size: null,
            },
            { name: "flare.physics.DragForce", size: 1082 },
            {
                name: "flare.physics.GravityForce",
                size: 1336,
            },
            { name: "flare.physics.IForce", size: 319 },
            {
                name: "flare.physics.NBodyForce",
                size: 10498,
            },
            { name: "flare.physics.Particle", size: 2822 },
            {
                name: "flare.physics.Simulation",
                size: 9983,
            },
            { name: "flare.physics.Spring", size: 2213 },
            {
                name: "flare.physics.SpringForce",
                size: 1681,
            },
            { name: "flare.query", size: null },
            {
                name: "flare.query.AggregateExpression",
                size: 1616,
            },
            { name: "flare.query.And", size: 1027 },
            {
                name: "flare.query.Arithmetic",
                size: 3891,
            },
            { name: "flare.query.Average", size: 891 },
            {
                name: "flare.query.BinaryExpression",
                size: 2893,
            },
            { name: "flare.query.Comparison", size: 5103 },
            {
                name: "flare.query.CompositeExpression",
                size: 3677,
            },
            { name: "flare.query.Count", size: 781 },
            {
                name: "flare.query.DateUtil",
                size: 4141,
            },
            { name: "flare.query.Distinct", size: 933 },
            {
                name: "flare.query.Expression",
                size: 5130,
            },
            { name: "flare.query.ExpressionIterator", size: 3617 },
            {
                name: "flare.query.Fn",
                size: 3240,
            },
            { name: "flare.query.If", size: 2732 },
            {
                name: "flare.query.IsA",
                size: 2039,
            },
            { name: "flare.query.Literal", size: 1214 },
            {
                name: "flare.query.Match",
                size: 3748,
            },
            { name: "flare.query.Maximum", size: 843 },
            {
                name: "flare.query.methods",
                size: null,
            },
            { name: "flare.query.methods.add", size: 593 },
            {
                name: "flare.query.methods.and",
                size: 330,
            },
            { name: "flare.query.methods.average", size: 287 },
            {
                name: "flare.query.methods.count",
                size: 277,
            },
            { name: "flare.query.methods.distinct", size: 292 },
            {
                name: "flare.query.methods.div",
                size: 595,
            },
            { name: "flare.query.methods.eq", size: 594 },
            {
                name: "flare.query.methods.fn",
                size: 460,
            },
            { name: "flare.query.methods.gt", size: 603 },
            {
                name: "flare.query.methods.gte",
                size: 625,
            },
            { name: "flare.query.methods.iff", size: 748 },
            {
                name: "flare.query.methods.isa",
                size: 461,
            },
            { name: "flare.query.methods.lt", size: 597 },
            {
                name: "flare.query.methods.lte",
                size: 619,
            },
            { name: "flare.query.methods.max", size: 283 },
            {
                name: "flare.query.methods.min",
                size: 283,
            },
            { name: "flare.query.methods.mod", size: 591 },
            {
                name: "flare.query.methods.mul",
                size: 603,
            },
            { name: "flare.query.methods.neq", size: 599 },
            {
                name: "flare.query.methods.not",
                size: 386,
            },
            { name: "flare.query.methods.or", size: 323 },
            {
                name: "flare.query.methods.orderby",
                size: 307,
            },
            { name: "flare.query.methods.range", size: 772 },
            {
                name: "flare.query.methods.select",
                size: 296,
            },
            { name: "flare.query.methods.stddev", size: 363 },
            {
                name: "flare.query.methods.sub",
                size: 600,
            },
            { name: "flare.query.methods.sum", size: 280 },
            {
                name: "flare.query.methods.update",
                size: 307,
            },
            { name: "flare.query.methods.variance", size: 335 },
            {
                name: "flare.query.methods.where",
                size: 299,
            },
            { name: "flare.query.methods.xor", size: 354 },
            {
                name: "flare.query.methods._",
                size: 264,
            },
            { name: "flare.query.Minimum", size: 843 },
            {
                name: "flare.query.Not",
                size: 1554,
            },
            { name: "flare.query.Or", size: 970 },
            {
                name: "flare.query.Query",
                size: 13896,
            },
            { name: "flare.query.Range", size: 1594 },
            {
                name: "flare.query.StringUtil",
                size: 4130,
            },
            { name: "flare.query.Sum", size: 791 },
            {
                name: "flare.query.Variable",
                size: 1124,
            },
            { name: "flare.query.Variance", size: 1876 },
            {
                name: "flare.query.Xor",
                size: 1101,
            },
            { name: "flare.scale", size: null },
            {
                name: "flare.scale.IScaleMap",
                size: 2105,
            },
            { name: "flare.scale.LinearScale", size: 1316 },
            {
                name: "flare.scale.LogScale",
                size: 3151,
            },
            { name: "flare.scale.OrdinalScale", size: 3770 },
            {
                name: "flare.scale.QuantileScale",
                size: 2435,
            },
            { name: "flare.scale.QuantitativeScale", size: 4839 },
            {
                name: "flare.scale.RootScale",
                size: 1756,
            },
            { name: "flare.scale.Scale", size: 4268 },
            {
                name: "flare.scale.ScaleType",
                size: 1821,
            },
            { name: "flare.scale.TimeScale", size: 5833 },
            {
                name: "flare.util",
                size: null,
            },
            { name: "flare.util.Arrays", size: 8258 },
            {
                name: "flare.util.Colors",
                size: 10001,
            },
            { name: "flare.util.Dates", size: 8217 },
            {
                name: "flare.util.Displays",
                size: 12555,
            },
            { name: "flare.util.Filter", size: 2324 },
            {
                name: "flare.util.Geometry",
                size: 10993,
            },
            { name: "flare.util.heap", size: null },
            {
                name: "flare.util.heap.FibonacciHeap",
                size: 9354,
            },
            { name: "flare.util.heap.HeapNode", size: 1233 },
            {
                name: "flare.util.IEvaluable",
                size: 335,
            },
            { name: "flare.util.IPredicate", size: 383 },
            {
                name: "flare.util.IValueProxy",
                size: 874,
            },
            { name: "flare.util.math", size: null },
            {
                name: "flare.util.math.DenseMatrix",
                size: 3165,
            },
            { name: "flare.util.math.IMatrix", size: 2815 },
            {
                name: "flare.util.math.SparseMatrix",
                size: 3366,
            },
            { name: "flare.util.Maths", size: 17705 },
            {
                name: "flare.util.Orientation",
                size: 1486,
            },
            { name: "flare.util.palette", size: null },
            {
                name: "flare.util.palette.ColorPalette",
                size: 6367,
            },
            { name: "flare.util.palette.Palette", size: 1229 },
            {
                name: "flare.util.palette.ShapePalette",
                size: 2059,
            },
            { name: "flare.util.palette.SizePalette", size: 2291 },
            {
                name: "flare.util.Property",
                size: 5559,
            },
            { name: "flare.util.Shapes", size: 19118 },
            {
                name: "flare.util.Sort",
                size: 6887,
            },
            { name: "flare.util.Stats", size: 6557 },
            {
                name: "flare.util.Strings",
                size: 22026,
            },
            { name: "flare.vis", size: null },
            { name: "flare.vis.axis", size: null },
            {
                name: "flare.vis.axis.Axes",
                size: 1302,
            },
            { name: "flare.vis.axis.Axis", size: 24593 },
            {
                name: "flare.vis.axis.AxisGridLine",
                size: 652,
            },
            { name: "flare.vis.axis.AxisLabel", size: 636 },
            {
                name: "flare.vis.axis.CartesianAxes",
                size: 6703,
            },
            { name: "flare.vis.controls", size: null },
            {
                name: "flare.vis.controls.AnchorControl",
                size: 2138,
            },
            { name: "flare.vis.controls.ClickControl", size: 3824 },
            {
                name: "flare.vis.controls.Control",
                size: 1353,
            },
            { name: "flare.vis.controls.ControlList", size: 4665 },
            {
                name: "flare.vis.controls.DragControl",
                size: 2649,
            },
            { name: "flare.vis.controls.ExpandControl", size: 2832 },
            {
                name: "flare.vis.controls.HoverControl",
                size: 4896,
            },
            { name: "flare.vis.controls.IControl", size: 763 },
            {
                name: "flare.vis.controls.PanZoomControl",
                size: 5222,
            },
            { name: "flare.vis.controls.SelectionControl", size: 7862 },
            {
                name: "flare.vis.controls.TooltipControl",
                size: 8435,
            },
            { name: "flare.vis.data", size: null },
            {
                name: "flare.vis.data.Data",
                size: 20544,
            },
            { name: "flare.vis.data.DataList", size: 19788 },
            {
                name: "flare.vis.data.DataSprite",
                size: 10349,
            },
            { name: "flare.vis.data.EdgeSprite", size: 3301 },
            {
                name: "flare.vis.data.NodeSprite",
                size: 19382,
            },
            { name: "flare.vis.data.render", size: null },
            {
                name: "flare.vis.data.render.ArrowType",
                size: 698,
            },
            { name: "flare.vis.data.render.EdgeRenderer", size: 5569 },
            {
                name: "flare.vis.data.render.IRenderer",
                size: 353,
            },
            { name: "flare.vis.data.render.ShapeRenderer", size: 2247 },
            {
                name: "flare.vis.data.ScaleBinding",
                size: 11275,
            },
            { name: "flare.vis.data.Tree", size: 7147 },
            {
                name: "flare.vis.data.TreeBuilder",
                size: 9930,
            },
            { name: "flare.vis.events", size: null },
            {
                name: "flare.vis.events.DataEvent",
                size: 2313,
            },
            { name: "flare.vis.events.SelectionEvent", size: 1880 },
            {
                name: "flare.vis.events.TooltipEvent",
                size: 1701,
            },
            { name: "flare.vis.events.VisualizationEvent", size: 1117 },
            {
                name: "flare.vis.legend",
                size: null,
            },
            { name: "flare.vis.legend.Legend", size: 20859 },
            {
                name: "flare.vis.legend.LegendItem",
                size: 4614,
            },
            { name: "flare.vis.legend.LegendRange", size: 10530 },
            {
                name: "flare.vis.operator",
                size: null,
            },
            {
                name: "flare.vis.operator.distortion",
                size: null,
            },
            {
                name: "flare.vis.operator.distortion.BifocalDistortion",
                size: 4461,
            },
            {
                name: "flare.vis.operator.distortion.Distortion",
                size: 6314,
            },
            {
                name: "flare.vis.operator.distortion.FisheyeDistortion",
                size: 3444,
            },
            { name: "flare.vis.operator.encoder", size: null },
            {
                name: "flare.vis.operator.encoder.ColorEncoder",
                size: 3179,
            },
            {
                name: "flare.vis.operator.encoder.Encoder",
                size: 4060,
            },
            {
                name: "flare.vis.operator.encoder.PropertyEncoder",
                size: 4138,
            },
            {
                name: "flare.vis.operator.encoder.ShapeEncoder",
                size: 1690,
            },
            { name: "flare.vis.operator.encoder.SizeEncoder", size: 1830 },
            {
                name: "flare.vis.operator.filter",
                size: null,
            },
            {
                name: "flare.vis.operator.filter.FisheyeTreeFilter",
                size: 5219,
            },
            {
                name: "flare.vis.operator.filter.GraphDistanceFilter",
                size: 3165,
            },
            { name: "flare.vis.operator.filter.VisibilityFilter", size: 3509 },
            {
                name: "flare.vis.operator.IOperator",
                size: 1286,
            },
            { name: "flare.vis.operator.label", size: null },
            {
                name: "flare.vis.operator.label.Labeler",
                size: 9956,
            },
            {
                name: "flare.vis.operator.label.RadialLabeler",
                size: 3899,
            },
            { name: "flare.vis.operator.label.StackedAreaLabeler", size: 3202 },
            {
                name: "flare.vis.operator.layout",
                size: null,
            },
            {
                name: "flare.vis.operator.layout.AxisLayout",
                size: 6725,
            },
            {
                name: "flare.vis.operator.layout.BundledEdgeRouter",
                size: 3727,
            },
            {
                name: "flare.vis.operator.layout.CircleLayout",
                size: 9317,
            },
            {
                name: "flare.vis.operator.layout.CirclePackingLayout",
                size: 12003,
            },
            {
                name: "flare.vis.operator.layout.DendrogramLayout",
                size: 4853,
            },
            {
                name: "flare.vis.operator.layout.ForceDirectedLayout",
                size: 8411,
            },
            {
                name: "flare.vis.operator.layout.IcicleTreeLayout",
                size: 4864,
            },
            {
                name: "flare.vis.operator.layout.IndentedTreeLayout",
                size: 3174,
            },
            {
                name: "flare.vis.operator.layout.Layout",
                size: 7881,
            },
            {
                name: "flare.vis.operator.layout.NodeLinkTreeLayout",
                size: 12870,
            },
            {
                name: "flare.vis.operator.layout.PieLayout",
                size: 2728,
            },
            {
                name: "flare.vis.operator.layout.RadialTreeLayout",
                size: 12348,
            },
            {
                name: "flare.vis.operator.layout.RandomLayout",
                size: 870,
            },
            {
                name: "flare.vis.operator.layout.StackedAreaLayout",
                size: 9121,
            },
            { name: "flare.vis.operator.layout.TreeMapLayout", size: 9191 },
            {
                name: "flare.vis.operator.Operator",
                size: 2490,
            },
            { name: "flare.vis.operator.OperatorList", size: 5248 },
            {
                name: "flare.vis.operator.OperatorSequence",
                size: 4190,
            },
            { name: "flare.vis.operator.OperatorSwitch", size: 2581 },
            {
                name: "flare.vis.operator.SortOperator",
                size: 2023,
            },
            { name: "flare.vis.Visualization", size: 16540 },
        ],
    };

    self.flare2 = {
        name: "flare",
        children: [
            {
                name: "analytics",
                children: [
                    {
                        name: "cluster",
                        children: [
                            { name: "AgglomerativeCluster", size: 3938 },
                            { name: "CommunityStructure", size: 3812 },
                            { name: "HierarchicalCluster", size: 6714 },
                            { name: "MergeEdge", size: 743 },
                        ],
                    },
                    {
                        name: "graph",
                        children: [
                            { name: "BetweennessCentrality", size: 3534 },
                            { name: "LinkDistance", size: 5731 },
                            { name: "MaxFlowMinCut", size: 7840 },
                            { name: "ShortestPaths", size: 5914 },
                            { name: "SpanningTree", size: 3416 },
                        ],
                    },
                    {
                        name: "optimization",
                        children: [{ name: "AspectRatioBanker", size: 7074 }],
                    },
                ],
            },
            {
                name: "animate",
                children: [
                    { name: "Easing", size: 17010 },
                    { name: "FunctionSequence", size: 5842 },
                    {
                        name: "interpolate",
                        children: [
                            { name: "ArrayInterpolator", size: 1983 },
                            { name: "ColorInterpolator", size: 2047 },
                            { name: "DateInterpolator", size: 1375 },
                            { name: "Interpolator", size: 8746 },
                            { name: "MatrixInterpolator", size: 2202 },
                            { name: "NumberInterpolator", size: 1382 },
                            { name: "ObjectInterpolator", size: 1629 },
                            { name: "PointInterpolator", size: 1675 },
                            { name: "RectangleInterpolator", size: 2042 },
                        ],
                    },
                    { name: "ISchedulable", size: 1041 },
                    { name: "Parallel", size: 5176 },
                    { name: "Pause", size: 449 },
                    { name: "Scheduler", size: 5593 },
                    { name: "Sequence", size: 5534 },
                    { name: "Transition", size: 9201 },
                    { name: "Transitioner", size: 19975 },
                    { name: "TransitionEvent", size: 1116 },
                    { name: "Tween", size: 6006 },
                ],
            },
            {
                name: "data",
                children: [
                    {
                        name: "converters",
                        children: [
                            { name: "Converters", size: 721 },
                            { name: "DelimitedTextConverter", size: 4294 },
                            { name: "GraphMLConverter", size: 9800 },
                            { name: "IDataConverter", size: 1314 },
                            { name: "JSONConverter", size: 2220 },
                        ],
                    },
                    { name: "DataField", size: 1759 },
                    { name: "DataSchema", size: 2165 },
                    { name: "DataSet", size: 586 },
                    { name: "DataSource", size: 3331 },
                    { name: "DataTable", size: 772 },
                    { name: "DataUtil", size: 3322 },
                ],
            },
            {
                name: "display",
                children: [
                    { name: "DirtySprite", size: 8833 },
                    { name: "LineSprite", size: 1732 },
                    { name: "RectSprite", size: 3623 },
                    { name: "TextSprite", size: 10066 },
                ],
            },
            {
                name: "flex",
                children: [{ name: "FlareVis", size: 4116 }],
            },
            {
                name: "physics",
                children: [
                    { name: "DragForce", size: 1082 },
                    { name: "GravityForce", size: 1336 },
                    { name: "IForce", size: 319 },
                    { name: "NBodyForce", size: 10498 },
                    { name: "Particle", size: 2822 },
                    { name: "Simulation", size: 9983 },
                    { name: "Spring", size: 2213 },
                    { name: "SpringForce", size: 1681 },
                ],
            },
            {
                name: "query",
                children: [
                    { name: "AggregateExpression", size: 1616 },
                    { name: "And", size: 1027 },
                    { name: "Arithmetic", size: 3891 },
                    { name: "Average", size: 891 },
                    { name: "BinaryExpression", size: 2893 },
                    { name: "Comparison", size: 5103 },
                    { name: "CompositeExpression", size: 3677 },
                    { name: "Count", size: 781 },
                    { name: "DateUtil", size: 4141 },
                    { name: "Distinct", size: 933 },
                    { name: "Expression", size: 5130 },
                    { name: "ExpressionIterator", size: 3617 },
                    { name: "Fn", size: 3240 },
                    { name: "If", size: 2732 },
                    { name: "IsA", size: 2039 },
                    { name: "Literal", size: 1214 },
                    { name: "Match", size: 3748 },
                    { name: "Maximum", size: 843 },
                    {
                        name: "methods",
                        children: [
                            { name: "add", size: 593 },
                            { name: "and", size: 330 },
                            { name: "average", size: 287 },
                            { name: "count", size: 277 },
                            { name: "distinct", size: 292 },
                            { name: "div", size: 595 },
                            { name: "eq", size: 594 },
                            { name: "fn", size: 460 },
                            { name: "gt", size: 603 },
                            { name: "gte", size: 625 },
                            { name: "iff", size: 748 },
                            { name: "isa", size: 461 },
                            { name: "lt", size: 597 },
                            { name: "lte", size: 619 },
                            { name: "max", size: 283 },
                            { name: "min", size: 283 },
                            { name: "mod", size: 591 },
                            { name: "mul", size: 603 },
                            { name: "neq", size: 599 },
                            { name: "not", size: 386 },
                            { name: "or", size: 323 },
                            { name: "orderby", size: 307 },
                            { name: "range", size: 772 },
                            { name: "select", size: 296 },
                            { name: "stddev", size: 363 },
                            { name: "sub", size: 600 },
                            { name: "sum", size: 280 },
                            { name: "update", size: 307 },
                            { name: "variance", size: 335 },
                            { name: "where", size: 299 },
                            { name: "xor", size: 354 },
                            { name: "_", size: 264 },
                        ],
                    },
                    { name: "Minimum", size: 843 },
                    { name: "Not", size: 1554 },
                    { name: "Or", size: 970 },
                    { name: "Query", size: 13896 },
                    { name: "Range", size: 1594 },
                    { name: "StringUtil", size: 4130 },
                    { name: "Sum", size: 791 },
                    { name: "Variable", size: 1124 },
                    { name: "Variance", size: 1876 },
                    { name: "Xor", size: 1101 },
                ],
            },
            {
                name: "scale",
                children: [
                    { name: "IScaleMap", size: 2105 },
                    { name: "LinearScale", size: 1316 },
                    { name: "LogScale", size: 3151 },
                    { name: "OrdinalScale", size: 3770 },
                    { name: "QuantileScale", size: 2435 },
                    { name: "QuantitativeScale", size: 4839 },
                    { name: "RootScale", size: 1756 },
                    { name: "Scale", size: 4268 },
                    { name: "ScaleType", size: 1821 },
                    { name: "TimeScale", size: 5833 },
                ],
            },
            {
                name: "util",
                children: [
                    { name: "Arrays", size: 8258 },
                    { name: "Colors", size: 10001 },
                    { name: "Dates", size: 8217 },
                    { name: "Displays", size: 12555 },
                    { name: "Filter", size: 2324 },
                    { name: "Geometry", size: 10993 },
                    {
                        name: "heap",
                        children: [
                            { name: "FibonacciHeap", size: 9354 },
                            { name: "HeapNode", size: 1233 },
                        ],
                    },
                    { name: "IEvaluable", size: 335 },
                    { name: "IPredicate", size: 383 },
                    { name: "IValueProxy", size: 874 },
                    {
                        name: "math",
                        children: [
                            { name: "DenseMatrix", size: 3165 },
                            { name: "IMatrix", size: 2815 },
                            { name: "SparseMatrix", size: 3366 },
                        ],
                    },
                    { name: "Maths", size: 17705 },
                    { name: "Orientation", size: 1486 },
                    {
                        name: "palette",
                        children: [
                            { name: "ColorPalette", size: 6367 },
                            { name: "Palette", size: 1229 },
                            { name: "ShapePalette", size: 2059 },
                            { name: "SizePalette", size: 2291 },
                        ],
                    },
                    { name: "Property", size: 5559 },
                    { name: "Shapes", size: 19118 },
                    { name: "Sort", size: 6887 },
                    { name: "Stats", size: 6557 },
                    { name: "Strings", size: 22026 },
                ],
            },
            {
                name: "vis",
                children: [
                    {
                        name: "axis",
                        children: [
                            { name: "Axes", size: 1302 },
                            { name: "Axis", size: 24593 },
                            { name: "AxisGridLine", size: 652 },
                            { name: "AxisLabel", size: 636 },
                            { name: "CartesianAxes", size: 6703 },
                        ],
                    },
                    {
                        name: "controls",
                        children: [
                            { name: "AnchorControl", size: 2138 },
                            { name: "ClickControl", size: 3824 },
                            { name: "Control", size: 1353 },
                            { name: "ControlList", size: 4665 },
                            { name: "DragControl", size: 2649 },
                            { name: "ExpandControl", size: 2832 },
                            { name: "HoverControl", size: 4896 },
                            { name: "IControl", size: 763 },
                            { name: "PanZoomControl", size: 5222 },
                            { name: "SelectionControl", size: 7862 },
                            { name: "TooltipControl", size: 8435 },
                        ],
                    },
                    {
                        name: "data",
                        children: [
                            { name: "Data", size: 20544 },
                            { name: "DataList", size: 19788 },
                            { name: "DataSprite", size: 10349 },
                            { name: "EdgeSprite", size: 3301 },
                            { name: "NodeSprite", size: 19382 },
                            {
                                name: "render",
                                children: [
                                    { name: "ArrowType", size: 698 },
                                    { name: "EdgeRenderer", size: 5569 },
                                    { name: "IRenderer", size: 353 },
                                    { name: "ShapeRenderer", size: 2247 },
                                ],
                            },
                            { name: "ScaleBinding", size: 11275 },
                            { name: "Tree", size: 7147 },
                            { name: "TreeBuilder", size: 9930 },
                        ],
                    },
                    {
                        name: "events",
                        children: [
                            { name: "DataEvent", size: 2313 },
                            { name: "SelectionEvent", size: 1880 },
                            { name: "TooltipEvent", size: 1701 },
                            { name: "VisualizationEvent", size: 1117 },
                        ],
                    },
                    {
                        name: "legend",
                        children: [
                            { name: "Legend", size: 20859 },
                            { name: "LegendItem", size: 4614 },
                            { name: "LegendRange", size: 10530 },
                        ],
                    },
                    {
                        name: "operator",
                        children: [
                            {
                                name: "distortion",
                                children: [
                                    { name: "BifocalDistortion", size: 4461 },
                                    { name: "Distortion", size: 6314 },
                                    { name: "FisheyeDistortion", size: 3444 },
                                ],
                            },
                            {
                                name: "encoder",
                                children: [
                                    { name: "ColorEncoder", size: 3179 },
                                    { name: "Encoder", size: 4060 },
                                    { name: "PropertyEncoder", size: 4138 },
                                    { name: "ShapeEncoder", size: 1690 },
                                    { name: "SizeEncoder", size: 1830 },
                                ],
                            },
                            {
                                name: "filter",
                                children: [
                                    { name: "FisheyeTreeFilter", size: 5219 },
                                    { name: "GraphDistanceFilter", size: 3165 },
                                    { name: "VisibilityFilter", size: 3509 },
                                ],
                            },
                            { name: "IOperator", size: 1286 },
                            {
                                name: "label",
                                children: [
                                    { name: "Labeler", size: 9956 },
                                    { name: "RadialLabeler", size: 3899 },
                                    { name: "StackedAreaLabeler", size: 3202 },
                                ],
                            },
                            {
                                name: "layout",
                                children: [
                                    { name: "AxisLayout", size: 6725 },
                                    { name: "BundledEdgeRouter", size: 3727 },
                                    { name: "CircleLayout", size: 9317 },
                                    { name: "CirclePackingLayout", size: 12003 },
                                    { name: "DendrogramLayout", size: 4853 },
                                    { name: "ForceDirectedLayout", size: 8411 },
                                    { name: "IcicleTreeLayout", size: 4864 },
                                    { name: "IndentedTreeLayout", size: 3174 },
                                    { name: "Layout", size: 7881 },
                                    { name: "NodeLinkTreeLayout", size: 12870 },
                                    { name: "PieLayout", size: 2728 },
                                    { name: "RadialTreeLayout", size: 12348 },
                                    { name: "RandomLayout", size: 870 },
                                    { name: "StackedAreaLayout", size: 9121 },
                                    { name: "TreeMapLayout", size: 9191 },
                                ],
                            },
                            { name: "Operator", size: 2490 },
                            { name: "OperatorList", size: 5248 },
                            { name: "OperatorSequence", size: 4190 },
                            { name: "OperatorSwitch", size: 2581 },
                            { name: "SortOperator", size: 2023 },
                        ],
                    },
                    { name: "Visualization", size: 16540 },
                ],
            },
        ],
    };

    self.flare3 = {
        name: "What is Lead Mapping?",
        children: [
            {
                name: "What are leads?",
                children: [
                    {
                        name: "There are different kind of leads...",
                        children: [
                            { name: "Leads you already have", size: 3938 },
                            { name: "Leads you don't have", size: 3812 },
                            { name: "Leads you need but don't know how to get", size: 6714 },
                        ],
                    },
                    {
                        name: "What can I do with leads",
                        children: [
                            { name: "Map them", size: 3534 },
                            { name: "Enter into CRM", size: 5731 },
                            { name: "Call them", size: 7840 },
                        ],
                    },
                    {
                        name: "Where do I get leads",
                        children: [
                            { name: "You can get them here", size: 7074 },
                            { name: "You can get them somewhere else", size: 5731 },
                        ],
                    },
                ],
            },
            {
                name: "What is mapping?",
                children: [
                    { name: "I know what mapping is, this is stupid", size: 17010 },
                    {
                        name: "I actually care, please tell me more",
                        size: 5842,
                        children: [
                            {
                                name: "well, it's like this...",
                                children: [
                                    { name: "When you have information with location data and you want to visualize it on a map", size: 1983 },
                                    { name: "Or... Gain business insights from existing company data", size: 2047 },
                                    { name: "Combine disparate data analyze location specific trends", size: 1375 },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "data",
                children: [
                    {
                        name: "converters",
                        children: [
                            { name: "Converters", size: 721 },
                            { name: "DelimitedTextConverter", size: 4294 },
                            { name: "GraphMLConverter", size: 9800 },
                            { name: "IDataConverter", size: 1314 },
                            { name: "JSONConverter", size: 2220 },
                        ],
                    },
                    { name: "DataField", size: 1759 },
                    { name: "DataSchema", size: 2165 },
                    { name: "DataSet", size: 586 },
                    { name: "DataSource", size: 3331 },
                    { name: "DataTable", size: 772 },
                    { name: "DataUtil", size: 3322 },
                ],
            },
            {
                name: "display",
                children: [
                    { name: "DirtySprite", size: 8833 },
                    { name: "LineSprite", size: 1732 },
                    { name: "RectSprite", size: 3623 },
                    { name: "TextSprite", size: 10066 },
                ],
            },
            {
                name: "flex",
                children: [{ name: "FlareVis", size: 4116 }],
            },
            {
                name: "physics",
                children: [
                    { name: "DragForce", size: 1082 },
                    { name: "GravityForce", size: 1336 },
                    { name: "IForce", size: 319 },
                    { name: "NBodyForce", size: 10498 },
                    { name: "Particle", size: 2822 },
                    { name: "Simulation", size: 9983 },
                    { name: "Spring", size: 2213 },
                    { name: "SpringForce", size: 1681 },
                ],
            },
            {
                name: "query",
                children: [
                    { name: "AggregateExpression", size: 1616 },
                    { name: "And", size: 1027 },
                    { name: "Arithmetic", size: 3891 },
                    { name: "Average", size: 891 },
                    { name: "BinaryExpression", size: 2893 },
                    { name: "Comparison", size: 5103 },
                    { name: "CompositeExpression", size: 3677 },
                    { name: "Count", size: 781 },
                    { name: "DateUtil", size: 4141 },
                    { name: "Distinct", size: 933 },
                    { name: "Expression", size: 5130 },
                    { name: "ExpressionIterator", size: 3617 },
                    { name: "Fn", size: 3240 },
                    { name: "If", size: 2732 },
                    { name: "IsA", size: 2039 },
                    { name: "Literal", size: 1214 },
                    { name: "Match", size: 3748 },
                    { name: "Maximum", size: 843 },
                    {
                        name: "methods",
                        children: [
                            { name: "add", size: 593 },
                            { name: "and", size: 330 },
                            { name: "average", size: 287 },
                            { name: "count", size: 277 },
                            { name: "distinct", size: 292 },
                            { name: "div", size: 595 },
                            { name: "eq", size: 594 },
                            { name: "fn", size: 460 },
                            { name: "gt", size: 603 },
                            { name: "gte", size: 625 },
                            { name: "iff", size: 748 },
                            { name: "isa", size: 461 },
                            { name: "lt", size: 597 },
                            { name: "lte", size: 619 },
                            { name: "max", size: 283 },
                            { name: "min", size: 283 },
                            { name: "mod", size: 591 },
                            { name: "mul", size: 603 },
                            { name: "neq", size: 599 },
                            { name: "not", size: 386 },
                            { name: "or", size: 323 },
                            { name: "orderby", size: 307 },
                            { name: "range", size: 772 },
                            { name: "select", size: 296 },
                            { name: "stddev", size: 363 },
                            { name: "sub", size: 600 },
                            { name: "sum", size: 280 },
                            { name: "update", size: 307 },
                            { name: "variance", size: 335 },
                            { name: "where", size: 299 },
                            { name: "xor", size: 354 },
                            { name: "_", size: 264 },
                        ],
                    },
                    { name: "Minimum", size: 843 },
                    { name: "Not", size: 1554 },
                    { name: "Or", size: 970 },
                    { name: "Query", size: 13896 },
                    { name: "Range", size: 1594 },
                    { name: "StringUtil", size: 4130 },
                    { name: "Sum", size: 791 },
                    { name: "Variable", size: 1124 },
                    { name: "Variance", size: 1876 },
                    { name: "Xor", size: 1101 },
                ],
            },
            {
                name: "scale",
                children: [
                    { name: "IScaleMap", size: 2105 },
                    { name: "LinearScale", size: 1316 },
                    { name: "LogScale", size: 3151 },
                    { name: "OrdinalScale", size: 3770 },
                    { name: "QuantileScale", size: 2435 },
                    { name: "QuantitativeScale", size: 4839 },
                    { name: "RootScale", size: 1756 },
                    { name: "Scale", size: 4268 },
                    { name: "ScaleType", size: 1821 },
                    { name: "TimeScale", size: 5833 },
                ],
            },
            {
                name: "util",
                children: [
                    { name: "Arrays", size: 8258 },
                    { name: "Colors", size: 10001 },
                    { name: "Dates", size: 8217 },
                    { name: "Displays", size: 12555 },
                    { name: "Filter", size: 2324 },
                    { name: "Geometry", size: 10993 },
                    {
                        name: "heap",
                        children: [
                            { name: "FibonacciHeap", size: 9354 },
                            { name: "HeapNode", size: 1233 },
                        ],
                    },
                    { name: "IEvaluable", size: 335 },
                    { name: "IPredicate", size: 383 },
                    { name: "IValueProxy", size: 874 },
                    {
                        name: "math",
                        children: [
                            { name: "DenseMatrix", size: 3165 },
                            { name: "IMatrix", size: 2815 },
                            { name: "SparseMatrix", size: 3366 },
                        ],
                    },
                    { name: "Maths", size: 17705 },
                    { name: "Orientation", size: 1486 },
                    {
                        name: "palette",
                        children: [
                            { name: "ColorPalette", size: 6367 },
                            { name: "Palette", size: 1229 },
                            { name: "ShapePalette", size: 2059 },
                            { name: "SizePalette", size: 2291 },
                        ],
                    },
                    { name: "Property", size: 5559 },
                    { name: "Shapes", size: 19118 },
                    { name: "Sort", size: 6887 },
                    { name: "Stats", size: 6557 },
                    { name: "Strings", size: 22026 },
                ],
            },
            {
                name: "vis",
                children: [
                    {
                        name: "axis",
                        children: [
                            { name: "Axes", size: 1302 },
                            { name: "Axis", size: 24593 },
                            { name: "AxisGridLine", size: 652 },
                            { name: "AxisLabel", size: 636 },
                            { name: "CartesianAxes", size: 6703 },
                        ],
                    },
                    {
                        name: "controls",
                        children: [
                            { name: "AnchorControl", size: 2138 },
                            { name: "ClickControl", size: 3824 },
                            { name: "Control", size: 1353 },
                            { name: "ControlList", size: 4665 },
                            { name: "DragControl", size: 2649 },
                            { name: "ExpandControl", size: 2832 },
                            { name: "HoverControl", size: 4896 },
                            { name: "IControl", size: 763 },
                            { name: "PanZoomControl", size: 5222 },
                            { name: "SelectionControl", size: 7862 },
                            { name: "TooltipControl", size: 8435 },
                        ],
                    },
                    {
                        name: "data",
                        children: [
                            { name: "Data", size: 20544 },
                            { name: "DataList", size: 19788 },
                            { name: "DataSprite", size: 10349 },
                            { name: "EdgeSprite", size: 3301 },
                            { name: "NodeSprite", size: 19382 },
                            {
                                name: "render",
                                children: [
                                    { name: "ArrowType", size: 698 },
                                    { name: "EdgeRenderer", size: 5569 },
                                    { name: "IRenderer", size: 353 },
                                    { name: "ShapeRenderer", size: 2247 },
                                ],
                            },
                            { name: "ScaleBinding", size: 11275 },
                            { name: "Tree", size: 7147 },
                            { name: "TreeBuilder", size: 9930 },
                        ],
                    },
                    {
                        name: "events",
                        children: [
                            { name: "DataEvent", size: 2313 },
                            { name: "SelectionEvent", size: 1880 },
                            { name: "TooltipEvent", size: 1701 },
                            { name: "VisualizationEvent", size: 1117 },
                        ],
                    },
                    {
                        name: "legend",
                        children: [
                            { name: "Legend", size: 20859 },
                            { name: "LegendItem", size: 4614 },
                            { name: "LegendRange", size: 10530 },
                        ],
                    },
                    {
                        name: "operator",
                        children: [
                            {
                                name: "distortion",
                                children: [
                                    { name: "BifocalDistortion", size: 4461 },
                                    { name: "Distortion", size: 6314 },
                                    { name: "FisheyeDistortion", size: 3444 },
                                ],
                            },
                            {
                                name: "encoder",
                                children: [
                                    { name: "ColorEncoder", size: 3179 },
                                    { name: "Encoder", size: 4060 },
                                    { name: "PropertyEncoder", size: 4138 },
                                    { name: "ShapeEncoder", size: 1690 },
                                    { name: "SizeEncoder", size: 1830 },
                                ],
                            },
                            {
                                name: "filter",
                                children: [
                                    { name: "FisheyeTreeFilter", size: 5219 },
                                    { name: "GraphDistanceFilter", size: 3165 },
                                    { name: "VisibilityFilter", size: 3509 },
                                ],
                            },
                            { name: "IOperator", size: 1286 },
                            {
                                name: "label",
                                children: [
                                    { name: "Labeler", size: 9956 },
                                    { name: "RadialLabeler", size: 3899 },
                                    { name: "StackedAreaLabeler", size: 3202 },
                                ],
                            },
                            {
                                name: "layout",
                                children: [
                                    { name: "AxisLayout", size: 6725 },
                                    { name: "BundledEdgeRouter", size: 3727 },
                                    { name: "CircleLayout", size: 9317 },
                                    { name: "CirclePackingLayout", size: 12003 },
                                    { name: "DendrogramLayout", size: 4853 },
                                    { name: "ForceDirectedLayout", size: 8411 },
                                    { name: "IcicleTreeLayout", size: 4864 },
                                    { name: "IndentedTreeLayout", size: 3174 },
                                    { name: "Layout", size: 7881 },
                                    { name: "NodeLinkTreeLayout", size: 12870 },
                                    { name: "PieLayout", size: 2728 },
                                    { name: "RadialTreeLayout", size: 12348 },
                                    { name: "RandomLayout", size: 870 },
                                    { name: "StackedAreaLayout", size: 9121 },
                                    { name: "TreeMapLayout", size: 9191 },
                                ],
                            },
                            { name: "Operator", size: 2490 },
                            { name: "OperatorList", size: 5248 },
                            { name: "OperatorSequence", size: 4190 },
                            { name: "OperatorSwitch", size: 2581 },
                            { name: "SortOperator", size: 2023 },
                        ],
                    },
                    { name: "Visualization", size: 16540 },
                ],
            },
        ],
    };
    self.treemapSLSV = {
        name: "bestMatch",
        children: [
            {
                name: "ISO_15926-PCA",
                id: "ISO_15926-PCA",
                size: null,
                children: [
                    {
                        name: "individual",
                        id: "http://data.posccaesar.org/dm/Individual",
                        size: 9699389,
                        children: [
                            {
                                name: "physical object",
                                id: "http://data.posccaesar.org/dm/PhysicalObject",
                                size: 33944,
                                children: [
                                    {
                                        name: "RESISTOR",
                                        id: "http://data.posccaesar.org/rdl/RDS860174",
                                        size: 1,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "CFIHOS_READI",
                id: "CFIHOS_READI",
                size: null,
                children: [
                    {
                        name: "PhysicalObject",
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject",
                        size: 87159,
                        children: [
                            {
                                name: "InanimatePhysicalObject",
                                id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/InanimatePhysicalObject",
                                size: 7489,
                                children: [
                                    {
                                        name: "Artefact",
                                        id: "http://w3id.org/readi/rdl/D101001053",
                                        size: 457,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "CFIHOS_equipment",
                id: "CFIHOS_equipment",
                size: 0,
                children: [
                    {
                        name: "Artefact",
                        id: "http://w3id.org/readi/rdl/D101001053",
                        size: 457,
                        children: [],
                    },
                ],
            },
            {
                name: "ONE-MODEL",
                id: "ONE-MODEL",
                size: null,
                children: [
                    {
                        name: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Object",
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Object",
                        size: 2,
                        children: [
                            {
                                name: "PhysicalObject",
                                id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject",
                                size: 87159,
                                children: [
                                    {
                                        name: "InanimatePhysicalObject",
                                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/InanimatePhysicalObject",
                                        size: 7489,
                                        children: [
                                            {
                                                name: "Artefact",
                                                id: "http://w3id.org/readi/rdl/D101001053",
                                                size: 457,
                                                children: [
                                                    {
                                                        name: "transmitter",
                                                        id: "http://w3id.org/readi/rdl/CFIHOS-30000661",
                                                        size: 10,
                                                        children: [],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "ILAP",
                id: "ILAP",
                size: null,
                children: [
                    {
                        name: "http://data.posccaesar.org/ilap/refdata/NORSOK/Z-014/SCCSCoding/COR_E",
                        id: "http://data.posccaesar.org/ilap/refdata/NORSOK/Z-014/SCCSCoding/COR_E",
                        size: 2,
                        children: [
                            {
                                name: "Subsea equipment",
                                id: "http://data.posccaesar.org/ilap/refdata/NORSOK/Z-014/SCCSCoding/COR_EU",
                                size: 1,
                                children: [
                                    {
                                        name: "Subsea equipment",
                                        id: "http://data.posccaesar.org/ilap/refdata/NORSOK/Z-014/SCCSCoding/COR_EUU",
                                        size: 1,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                name: "ISO19008_COR",
                id: "ISO19008_COR",
                size: null,
                children: [
                    {
                        name: "http://souslesens.org/iso19008/cor/E",
                        id: "http://souslesens.org/iso19008/cor/E",
                        size: 2,
                        children: [],
                    },
                ],
            },
            {
                name: "ONE_maintenance",
                id: "ONE_maintenance",
                size: null,
                children: [
                    {
                        name: "http://souslesens.org/iso19008/pbs/A",
                        id: "http://souslesens.org/iso19008/pbs/A",
                        size: 1,
                        children: [],
                    },
                ],
            },
            {
                name: "ISO19008_PBS",
                id: "ISO19008_PBS",
                size: 0,
                children: [
                    {
                        name: "http://souslesens.org/iso19008/pbs/A",
                        id: "http://souslesens.org/iso19008/pbs/A",
                        size: 1,
                        children: [],
                    },
                ],
            },
            {
                name: "http://souslesens.org/osdu/ontology/AbstractMaster",
                id: "http://souslesens.org/osdu/ontology/AbstractMaster",
                size: null,
                children: [
                    {
                        name: "http://souslesens.org/osdu/ontology/Wel",
                        id: "http://souslesens.org/osdu/ontology/Wel",
                        size: 1,
                        children: [],
                    },
                ],
            },
            {
                name: "FMEA",
                id: "FMEA",
                size: null,
                children: [
                    {
                        name: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Object",
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Object",
                        size: 2,
                        children: [
                            {
                                name: "FunctionalObject",
                                id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject",
                                size: 2,
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ],
    };

    self.onClick = function (aaa) {
        click(aaa);
    };
    self.draw2 = function (data) {
        $("#graphDiv").load(
            "snippets/treemap3.html",
            function () {
                partition
                    .value(function (d) {
                        return d.size;
                    })
                    .nodes(data)
                    .forEach(function (d) {
                        d._children = d.children;
                        d.sum = d.value;
                        d.key = key(d);
                        d.fill = fill(d);
                    });

                // Now redefine the value function to use the previously-computed sum.
                partition
                    .children(function (d, depth) {
                        return depth < 2 ? d._children : null;
                    })
                    .value(function (d) {
                        return d.sum;
                    });

                var center = svg
                    .append("circle")
                    .attr("r", radius / 3)
                    .on("click", zoomOut);

                center.append("title").text("zoom out");

                var partitioned_data = partition.nodes(data).slice(1);

                var path = svg
                    .selectAll("path")
                    .data(partitioned_data)
                    .enter()
                    .append("path")
                    .attr("d", arc)
                    .style("fill", function (d) {
                        return d.fill;
                    })
                    .each(function (d) {
                        this._current = updateArc(d);
                    })
                    .on("click", zoomIn)
                    .on("mouseover", mouseOverArc)
                    .on("mousemove", mouseMoveArc)
                    .on("mouseout", mouseOutArc);

                var texts = svg
                    .selectAll("text")
                    .data(partitioned_data)
                    .enter()
                    .append("text")
                    .filter(filter_min_arc_size_text)
                    .attr("transform", function (d) {
                        return "rotate(" + computeTextRotation(d) + ")";
                    })
                    .attr("x", function (d) {
                        return (radius / 3) * d.depth;
                    })
                    .attr("dx", "6") // margin
                    .attr("dy", ".35em") // vertical-align
                    .text(function (d, _i) {
                        return d.name;
                    });

                function zoomIn(p) {
                    if (p.depth > 1) p = p.parent;
                    if (!p.children) return;
                    zoom(p, p);
                }

                function zoomOut(p) {
                    if (!p.parent) return;
                    zoom(p.parent, p);
                }

                // Zoom to the specified new root.
                function zoom(root, p) {
                    if (document.documentElement.__transition__) return;

                    // Rescale outside angles to match the new layout.
                    var enterArc,
                        exitArc,
                        outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

                    function insideArc(d) {
                        return p.key > d.key ? { depth: d.depth - 1, x: 0, dx: 0 } : p.key < d.key ? { depth: d.depth - 1, x: 2 * Math.PI, dx: 0 } : { depth: 0, x: 0, dx: 2 * Math.PI };
                    }

                    function outsideArc(d) {
                        return { depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x) };
                    }

                    center.datum(root);

                    // When zooming in, arcs enter from the outside and exit to the inside.
                    // Entering outside arcs start from the old layout.
                    if (root === p) (enterArc = outsideArc), (exitArc = insideArc), outsideAngle.range([p.x, p.x + p.dx]);

                    var new_data = partition.nodes(root).slice(1);

                    path = path.data(new_data, function (d) {
                        return d.key;
                    });

                    // When zooming out, arcs enter from the inside and exit to the outside.
                    // Exiting outside arcs transition to the new layout.
                    if (root !== p) (enterArc = insideArc), (exitArc = outsideArc), outsideAngle.range([p.x, p.x + p.dx]);

                    d3.transition()
                        .duration(d3.event.altKey ? 7500 : 750)
                        .each(function () {
                            path.exit()
                                .transition()
                                .style("fill-opacity", function (d) {
                                    return d.depth === 1 + (root === p) ? 1 : 0;
                                })
                                .attrTween("d", function (d) {
                                    return arcTween.call(this, exitArc(d));
                                })
                                .remove();

                            path.enter()
                                .append("path")
                                .style("fill-opacity", function (d) {
                                    return d.depth === 2 - (root === p) ? 1 : 0;
                                })
                                .style("fill", function (d) {
                                    return d.fill;
                                })
                                .on("click", zoomIn)
                                .on("mouseover", mouseOverArc)
                                .on("mousemove", mouseMoveArc)
                                .on("mouseout", mouseOutArc)
                                .each(function (d) {
                                    this._current = enterArc(d);
                                });

                            path.transition()
                                .style("fill-opacity", 1)
                                .attrTween("d", function (d) {
                                    return arcTween.call(this, updateArc(d));
                                });
                        });

                    texts = texts.data(new_data, function (d) {
                        return d.key;
                    });

                    texts.exit().remove();
                    texts.enter().append("text");

                    texts
                        .style("opacity", 0)
                        .attr("transform", function (d) {
                            return "rotate(" + computeTextRotation(d) + ")";
                        })
                        .attr("x", function (d) {
                            return (radius / 3) * d.depth;
                        })
                        .attr("dx", "6") // margin
                        .attr("dy", ".35em") // vertical-align
                        .filter(filter_min_arc_size_text)
                        .text(function (d, _i) {
                            return d.name;
                        })
                        .transition()
                        .delay(750)
                        .style("opacity", 1);
                }

                /*
            root = data;
            root.x0 = height / 2;
            root.y0 = 0;

            function collapse(d) {
                if (d.children) {
                    d._children = d.children;
                    d._children.forEach(collapse);
                    d.children = null;
                }
            }

            root.children.forEach(collapse);
            update(root);*/
            },
            500,
        );
    };

    self.draw = function (data) {
        $("#mainDialogDiv").load(
            "snippets/treemap.html",
            function () {
                $("#mainDialogDiv").dialog("open");
                var divId = d3.selectAll("#treeMapDiv")[0];
                divId = d3.selectAll("#treeMapDiv")[0];
                divId = "treeMapDiv";
                var _ = Treemap(data, divId, {
                    value: (d) => d.size, // size of each node (file); null for internal nodes (folders)
                    group: (d, n) => n.ancestors().slice(-2)[0].data.name, // e.g., "animate" in flare/animate/Easing; color
                    label: (d, n) => [...d.name.split(/(?=[A-Z][a-z])/g), n.value.toLocaleString("en")].join("\n"),
                    title: (d, n) =>
                        `${n
                            .ancestors()
                            .reverse()
                            .map((d) => d.data.name)
                            .join(".")}\n${n.value.toLocaleString("en")}`,
                    link: (d, n) =>
                        `https://github.com/prefuse/Flare/blob/master/flare/src/${n
                            .ancestors()
                            .reverse()
                            .map((d) => d.data.name)
                            .join("/")}.as`,
                    width: 1152,
                    height: 1152,
                });
            },
            3000,
        );
    };

    return self;
})();

export default TreeMap;

window.TreeMap = TreeMap;
