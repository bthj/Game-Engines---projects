var MESH_VERTICES = [];
var MESH_FACES = [];

var WireFrameRenderer = function() {
    
    var self = this;
    
    var CAMERA_LOCATION = [0, 0, 160];
    var CAMERA_LOOK_AT = [0, 0, 0];
    var CAMERA_UP = [0, 1, 0];
    var NEAR = -100;
    var FAR = -500;
    var FOV = 75;
    var ASPECT_RATIO = 4/3;
    //var VIEW_SCALING = 50;
    var VERTEX_SCALING = 1;
    
    
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
        
    
    ///// setting the camera location
        
    this.getCameraLoacationTransformMatrix = function( cameraLocationVector ) {
        // console.log('cameraLocationVector: '+cameraLocationVector);
        var t_x = -(cameraLocationVector[0]),
            t_y = -(cameraLocationVector[1]),
            t_z = -(cameraLocationVector[2]);
        
        return [
            [1, 0, 0, t_x],
            [0, 1, 0, t_y],
            [0, 0, 1, t_z],
            [0, 0, 0, 1]
        ];
    };
    
    
    
    ///// pointing and orienting the camera
    
    this.getCameraLookTransformMatrix = function( locationPoint, lookPoint, upVector ) {

        var lookDirectionVector = [
            lookPoint[0] - locationPoint[0],
            lookPoint[1] - locationPoint[1],
            lookPoint[2] - locationPoint[2]
        ];
        var n = self.getVectorNormalized( lookDirectionVector );
        
        var orthogonalToUpAndLook = self.getVectorCrossProduct( upVector, n );
        var u = self.getVectorNormalized( orthogonalToUpAndLook );
        
        var v = self.getVectorCrossProduct( n, u );
        
        return [
            [u[0], u[1], u[2], 0],
            [v[0], v[1], v[2], 0],
            [n[0], n[1], n[2], 0],
            [0, 0, 0, 1]
        ];
    };
    
    
    
    ///// projection
    
    this.getWidthAndHeightFromFOV = function( fov, near, aspectRatio ) {
        /*
            abandoned this method of getting width and height as it didn't
            play well with the interface, so, hardcoded instead...
        */
        var DEG2RAD = 3.14159265 / 180; // from http://www.songho.ca/opengl/gl_transform.html
        var width = Math.round( -2 * near * Math.tan(fov / 2 * DEG2RAD) );
        var height = Math.round( width / aspectRatio );
        canvas.width = 640; //width *= VIEW_SCALING;
        canvas.height = 480; //height *= VIEW_SCALING;
        return {
            'width': 640, //width,
            'height': 480 //height
        };
    };
    
    this.getPerspectiveTransformMatrix = function( near, far, width, height) {
        return [
            [(2*near)/width, 0, 0, 0],
            [0, ((2*near)/height), 0, 0],
            [0, 0, -(far+near)/(far-near), (-2*far*near)/(far-near)],
            [0, 0, -1, 0]
        ];
    };
    
    
    
    ///// matrix and vector utilities
    
    this.getVectorNormalized = function( vector ) {
        
        var length =   // ...or magnitude or norm...
            Math.sqrt(
                (vector[0] * vector[0]) +
                (vector[1] * vector[1]) +
                (vector[2] * vector[2])
            );
        
        return [
            vector[0] / length,
            vector[1] / length,
            vector[2] / length
        ];
    };
    
    this.getVectorCrossProduct = function( v1, v2 ) {
      
        return [
            v1[1]*v2[2] - v1[2]*v2[1],
            v1[2]*v2[0] - v1[0]*v2[2],
            v1[0]*v2[1] - v1[1]*v2[0]
        ];
    };
    
    this.multiplyMatrixes = function( m1, m2 ) {
        var resultMatrix = [];
        
        var m1rowCount = m1.length,
            m1columnCount = m1[0].length,
            m2columnCount = m2[0].length;
        
        for( var m1row = 0; m1row < m1rowCount; m1row++ ) {
            
            var oneResultRow = [];
            for( var m2col = 0; m2col < m2columnCount; m2col++ ) {
                
                var oneDotProduct = 0;
                for( var m1col = 0; m1col < m1columnCount; m1col++ ) {
                    
                    oneDotProduct += m1[m1row][m1col] * m2[m1col][m2col];
                }
                oneResultRow.push( oneDotProduct );
            }
            resultMatrix.push( oneResultRow );
        }
        return resultMatrix;
    };
    
    
    
    ///// wireframe rendering
    
    /*
        assume an array of vertices like [x, y, z, x, y, z, ...]
        and an array of "triangles with material, vertex uvs and vertex normals"
            as defined in https://github.com/mrdoob/three.js/wiki/JSON-Model-format-3.1
            which is obtained withe geometry export from http://threejs.org/editor/
    */
    this.getTriangleFaces = function( vertices, faces ) {
        /* we'll populate triangles with structure (3 dimensional array) like this:
        [
            [
                [50,50,50],[50,50,-50],[50,-50,50]    
            ],
            [ ... ]
            
        ]
        */
        var triangles = [];
        
        // each segment in the faces array contains 
        // color?, [vertex_index, vertex_index, vertex_index], <-- what we're after
        // [material_index],
        // [vertex_uv, vertex_uv, vertex_uv],
        // [vertex_normal, vertex_normal, vertex_normal]
        for( var facesSegment = 0; facesSegment < faces.length; facesSegment+=11 ) {
            var v1index = faces[facesSegment+1];
            var v2index = faces[facesSegment+2];
            var v3index = faces[facesSegment+3];
            var triangle = [];
            var vertex1 = [
                vertices[v1index*3], vertices[(v1index*3)+1], vertices[(v1index*3)+2]
            ];
            var vertex2 = [
                vertices[v2index*3], vertices[(v2index*3)+1], vertices[(v2index*3)+2]
            ];
            var vertex3 = [
                vertices[v3index*3], vertices[(v3index*3)+1], vertices[(v3index*3)+2]
            ];
            triangle.push(vertex1, vertex2, vertex3);
            triangles.push( triangle );
        }
        return triangles;
    };
    
    this.getViewTransformMatrix = function( wh ) {
        
        var cameraLocationTransform = 
            self.getCameraLoacationTransformMatrix(CAMERA_LOCATION);
        var cameraLookTransform = 
            self.getCameraLookTransformMatrix(CAMERA_LOCATION, CAMERA_LOOK_AT, CAMERA_UP);
        var perspectiveTransform = 
            self.getPerspectiveTransformMatrix( NEAR, FAR, wh.width, wh.height);
        
        // matrix multiplication is associative so order shouldn't matter
        //  but let's chain it towards left
        return self.multiplyMatrixes(
                perspectiveTransform,
                self.multiplyMatrixes(cameraLookTransform, cameraLocationTransform) );
    };
    
    this.getRowVectorAsColumnVector = function( rowVector ) {
        
        var columnVector = [];
        rowVector.forEach(function( rowValue ){
            columnVector.push( [rowValue] );
        });
        return columnVector;
    };
    
    var clipping = false;
    
    // as in the given pseudo code at the end of
    //  https://blog.itu.dk/MGAE-E2013/files/2013/09/transforms.pdf
    this.renderWireframe = function( vertices, faces ) {
        
        var wh = self.getWidthAndHeightFromFOV( FOV, NEAR, ASPECT_RATIO );
        // console.log('width: '+ wh.width+', height: '+wh.height);
        
        var viewTransform = self.getViewTransformMatrix( wh );
        // console.log( viewTransform );
        
        var triangles = self.getTriangleFaces( vertices, faces );
        
        clipping = false;
        triangles.forEach(function(triangle){
            var vertexSkippedDueToClipping = false;
            var triangle2DPoints = [];
            
            for( triangleIndex = 0; triangleIndex < triangle.length; triangleIndex++ ) {
                var vertex = triangle[triangleIndex];
                vertex[0] *= VERTEX_SCALING;
                vertex[1] *= VERTEX_SCALING;
                vertex[2] *= VERTEX_SCALING;
                vertex.push( 1 ); // dummy (homogeneous) coordinate
                
                // console.log(vertex);

                var vertexViewSpace = self.multiplyMatrixes( 
                    viewTransform, self.getRowVectorAsColumnVector(vertex) );
                
                // console.log( vertexViewSpace );
                
                // normalize
                vertexViewSpace[0] = vertexViewSpace[0] / vertexViewSpace[3];
                vertexViewSpace[1] = vertexViewSpace[1] / vertexViewSpace[3];
                vertexViewSpace[2] = vertexViewSpace[2] / vertexViewSpace[3];
                //unnecessary, just for debugging:
                vertexViewSpace[3] = vertexViewSpace[3] / vertexViewSpace[3]; 
                
                // console.log(vertexViewSpace);
                
                // clipping
                if( 
                    (vertexViewSpace[0] < -1 || vertexViewSpace[0] > 1) ||
                    (vertexViewSpace[1] < -1 || vertexViewSpace[1] > 1) ||
                    (vertexViewSpace[2] < -1 || vertexViewSpace[2] > 1)
                ) {
                    vertexSkippedDueToClipping = true;
                    clipping = true;
                    // console.log("vertexSkippedDueToClipping");
                    break;
                }
                
                
                // map to 2d
                var screenCoordinate = {};
                screenCoordinate.x = vertexViewSpace[0] * (wh.width/2.0) + (wh.width/2.0);
                screenCoordinate.y = -vertexViewSpace[1] * (wh.height/2.0) + (wh.height/2.0);
                triangle2DPoints.push( screenCoordinate );
                
                // console.log( screenCoordinate );
                
                // draw vertex - let's have a bit visible, 4 by 4 pixels
                ctx.fillRect( screenCoordinate.x-2, screenCoordinate.y-2, 4, 4);
            }
            if( ! vertexSkippedDueToClipping ) {
                // draw lines connecting 2d vertices
                
                ctx.beginPath();
                ctx.moveTo(triangle2DPoints[0].x, triangle2DPoints[0].y);
                ctx.lineTo(triangle2DPoints[1].x, triangle2DPoints[1].y);
                ctx.lineTo(triangle2DPoints[2].x, triangle2DPoints[2].y);
                ctx.closePath();
                ctx.stroke();
                
            }
        });
        
        this.isClpping = function(){
            return clipping;
        };
    };
    
    
    
    // for UI interaction
    
    this.getCameraX = function() { return CAMERA_LOCATION[0]; };
    this.getCameraY = function() { return CAMERA_LOCATION[1]; };
    this.getCameraZ = function() { return CAMERA_LOCATION[2]; };
    
    this.setCameraX = function( x ) { CAMERA_LOCATION[0] = parseInt(x, 10); };
    this.setCameraY = function( y ) { CAMERA_LOCATION[1] = parseInt(y, 10); };
    this.setCameraZ = function( z ) { CAMERA_LOCATION[2] = parseInt(z, 10); };
    
    this.getNear = function() { return NEAR; };
    this.getFar = function() { return FAR; };
    
    this.setNear = function( near ) { NEAR = parseInt(near, 10); };
    this.setFar = function( far ) { FAR = parseInt(far, 10); };
};



$( document ).ready(function(){
    MESH_VERTICES = MESH_VERTICES__CUBE;
    MESH_FACES = MESH_FACES__CUBE;
    
    var wireframeRenderer = new WireFrameRenderer();
    
    $('#campos-x').val( wireframeRenderer.getCameraX() );
    $('#campos-y').val( wireframeRenderer.getCameraY() );
    $('#campos-z').val( wireframeRenderer.getCameraZ() );
    $('#near').val( wireframeRenderer.getNear() );
    $('#far').val( wireframeRenderer.getFar() );
    
    
    wireframeRenderer.renderWireframe( MESH_VERTICES, MESH_FACES );
    printClippingInfo( wireframeRenderer );
    
    
    // UI interaction
    
    $('#campos-x, #campos-y, #campos-z, #near, #far').change(function() {
        switch( $(this).attr('id') ){
            case 'campos-x':
                wireframeRenderer.setCameraX( $(this).val() );
                break;
            case 'campos-y':
                wireframeRenderer.setCameraY( $(this).val() );
                break;
            case 'campos-z':
                wireframeRenderer.setCameraZ( $(this).val() );
                break;
            case 'near':
                wireframeRenderer.setNear( $(this).val() );
                break;
            case 'far':
                wireframeRenderer.setFar( $(this).val() );
                break;
            default:
                break;
        }
        wireframeRenderer.renderWireframe( MESH_VERTICES, MESH_FACES );
        printClippingInfo( wireframeRenderer );
    });
    
    $("input[type='radio']").change(function(){
        switch( $(this).val() ) {
            case 'cube':
                MESH_VERTICES = MESH_VERTICES__CUBE;
                MESH_FACES = MESH_FACES__CUBE;
                break;
            case 'icosahedron':
                MESH_VERTICES = MESH_VERTICES__ICOSAHEDRON;
                MESH_FACES = MESH_FACES__ICOSAHEDRON;
                break;
            case 'sphere':
                MESH_VERTICES = MESH_VERTICES__SPHERE;
                MESH_FACES = MESH_FACES__SPHERE;
                break;
            case 'torusknot':
                MESH_VERTICES = MESH_VERTICES__TORUS_KNOT;
                MESH_FACES = MESH_FACES__TORUS_KNOT;
                break;
            default:
                break;
        }
        wireframeRenderer.renderWireframe( MESH_VERTICES, MESH_FACES );
    });
    
    function printClippingInfo( wireframeRenderer ) {
        if( wireframeRenderer.isClpping() ) {
            $('#info').text('Clipping!');
        } else {
            $('#info').text('');
        }
    }
    
});