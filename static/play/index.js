var canvas = document.getElementById( 'c' ),
    w = canvas.width = window.innerWidth,
    h = canvas.height = window.innerHeight,
    ctx = c.getContext( '2d' ),

    cx = w / 2,
    cy = h / 2,

    data = {},
    player = {},
    tick = 0,
    scale = 1,

    gradients = {},

    currentQuestion = {},

    bgCanvas = document.createElement( 'canvas' ),
    bgCtx = bgCanvas.getContext( '2d' );

data.location = window.location.hash.substr(1) || 'peru';
data.loaded = false;

function setupGradients(){
    
    gradients.questionDone = ctx.createRadialGradient( -3 * scale, -3 * scale, 0, 0, scale * 6 );
    gradients.questionDone.addColorStop( 0, '#4b5' );
    gradients.questionDone.addColorStop( .9, '#394' );
    gradients.questionDone.addColorStop( 1, '#121' );

    gradients.questionNotDone = ctx.createRadialGradient( -3 * scale, -3 * scale, 0, 0, scale * 6 );
    gradients.questionNotDone.addColorStop( 0, '#696' );
    gradients.questionNotDone.addColorStop( .9, '#575' );
    gradients.questionNotDone.addColorStop( 1, '#222' );

    gradients.player = ctx.createRadialGradient( -5 * scale, -5 * scale, 0, 0, scale * 10 );
    gradients.player.addColorStop( 0, '#4ac' );
    gradients.player.addColorStop( .9, '#368' );
    gradients.player.addColorStop( 1, '#134' );
}
function displayLoading( dots ){

    ctx.fillStyle = '#222';
    ctx.fillRect( 0, 0, w, h );

    ctx.font = '50px Verdana';

    var text = data.location.split('');
    text[ 0 ] = text[ 0 ].toUpperCase();
    text = 'Loading ' + text.join('');

    ctx.fillStyle = '#eee';
    ctx.fillText( text + ( Array( dots ).fill('.').join('') ), cx - ( ( ctx.measureText( text ).width / 2 ) | 0 ), cy - 25 );
}

function fillBackground(){

    bgCanvas.width = w;
    bgCanvas.height = h;

    bgCtx.lineWidth = scale * 5;
    bgCtx.strokeStyle = '#eee';

    var points = data.points,
        x = points[ 0 ].x,
        y = points[ 0 ].y;
    
    bgCtx.beginPath();
    bgCtx.moveTo( x, y );
    
    for( var i = 0; i < points.length; ++i ){
        
        var x2 = points[ i ].x * scale + cx,
            y2 = points[ i ].y * scale + cy,
                
            mx = ( x + x2 ) / 2,
            my = ( y + y2 ) / 2;
        
        bgCtx.quadraticCurveTo( x, y, mx, my );
        
        x = x2;
        y = y2;
        
    }
    
    bgCtx.lineTo( points[ points.length - 1 ].x, points[ points.length - 1 ].y );
    
    bgCtx.stroke();
}

(function init(){

    anim();
    
    var xhr = new XMLHttpRequest;
    xhr.open( 'GET', data.location + '-data.json' );
    xhr.onload = function(){
        
        data.loaded = true;
        var object = JSON.parse( xhr.responseText );
        data.questions = object.questions;
        data.points = object.points;
	data.sections = object.sections;

	data.score = 0;

        player.x = data.questions[ 0 ].x;
        player.y = data.questions[ 0 ].y;
        player.n = 0;

        fillBackground();
    }

})();

function incrementLevel(){
    
    ++player.n;

    if( player.n > data.questions.length )
        return finishModal();

    player.end = data.questions( player.n );
    player.dx = player.end.x - player.x;
    player.dy = player.end.y - player.y;

    player.moving = true;

    anim();
}
function finishModal(){

}
function drawQuestion( question ){

    var x = question.point.x,
	y = question.point.y,
	done = question.done;

    ctx.fillStyle = done ? gradients.questionDone : gradients.questionNotDone;
    ctx.translate( x, y );
    ctx.fillRect( -scale * 3, -scale * 3, scale * 6, scale * 6 );
    ctx.translate( -x, -y );

}
function drawPlayer( armonic ){

    var x = player.x + player.dx * armonic,
        y = player.y + player.dy * armonic;

    ctx.fillStyle = gradients.player;
    ctx.translate( x, y );
    ctx.fillRect( -scale * 5, -scale * 5, scale * 10, scale * 10 );
    ctx.translate( -x, -y );
    
}

function displayQuestion( question ){

    var element = document.createElement( 'div' );
    element.className = 'popup';
    element.style.setProperty( 'top', question.point.y );
    element.style.setProperty( 'left', question.point.x );

    var sectionText = '';
    for( var i = 0; i < data.sections.length; ++i )
        if( data.sections[ i ].name === question.section )
	   sectionText = data.sections[ i ].content;
    
    element.innerHTML = '<div class="section">\
                            <p>SECTION</p>\
			 </div>\
                         <div class="question">\
                           QUESTION\
			 </div>\
			 <div class="answers">\
			    <div class="options">\
			    </div>\
			    <div class="image">\
			       <img src="IMG-SRC">\
			    </div>\
			 </div>'
	.replace( 'SECTION', question.section + ' - ' + sectionText )
	.replace( 'QUESTION', '<h1>' + question.index + '</h1><p>' + question.content + '</p>' )
	.replace( 'IMG-SRC', question.imageSrc );

    var optionsEl = element.querySelector( '.options' );

    currentQuestion.answers = [];
    currentQuestion.markedAnswers = 0;
    currentQuestion.maxAnswers = question.maxAnswers;

    for( var i = 0; i < question.answers.length; ++i ){
    
        var answer = question.answers[ i ],
	    
	    optionEl = document.createElement( 'p' ),
	    clickable = document.createElement( 'button' ),
	    contentEl = document.createElement( 'span' );

	contentEl.textContent = answer.content;

	optionEl.appendChild( clickable );
	optionEl.appendChild( contentEl );

	optionsEl.appendChild( optionEl );

	clickable.addEventListener( 'click', getClick( optionEl, i ) );
        
	currentQuestion.answers.push( { marked: false, weight: answer.weight } );
    }

    var sendEl = document.createElement( 'button' );
    sendEl.addEventListener( 'click', (function( element ){
       
        return function(){
	    
	    element.classList.add( 'disappear' );

	    var score = 0;
	    for( var i = 0; i < currentQuestion.answers.length; ++i )
	        if( currentQuestion.answers[ i ].marked )
		    score += currentQuestion.answers[ i ].weight;

            data.score += score;

	    window.setTimeout( function(){
	        
		document.body.removeChild( element );

		incrementLevel();

	    }, 200 );
	}
    })() )
}
function getClick( element, index ){

    return function(){

        var answer = currentQuestion.answers[ index ];
        
	if( answer.marked ){
	
            --currentQuestion.markedAnswers;
	    answer.marked = false;
	    element.className = '';

	} else if( currentQuestion.markedAnswers < currentQuestion.maxAnswer ){
	
	    ++currentQuestion.markedAnswers;
	    answer.marked = true;
	    element.className = 'marked';
	}
    }
}

function anim(){

    if( !player.moving )
        window.requestAnimationFrame( anim );
    
    ++tick;
  
    if( data.loaded  ){

        ctx.fillStyle = '#222';
	ctx.fillRect( 0, 0, w, h );

        ctx.drawImage( bgCanvas, 0, 0 );
        
	for( var i = 0; i < data.questions.length; ++i )
	    drawQuestions( data.questions[ i ] );
        
        var proportion = tick / 60;
	drawPlayer( -Math.cos( tick * Math.PI ) / 2 + .5 );

	if( proportion >= 1 ){
	
	    player.moving = false;
	    tick = 0;

	    displayQuestion( data.questions[ player.n ] );
	}

    } else displayLoading( ( ( tick / 10 ) |0 ) % 4 );
}
