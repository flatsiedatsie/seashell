(function() {
  class Seashell extends window.Extension {
    constructor() {
      super('seashell');
      this.addMenuEntry('Seashell');

      this.content = '';
      fetch(`/extensions/${this.id}/views/content.html`)
        .then((res) => res.text())
        .then((text) => {
          this.content = text;
		  if( document.location.href.endsWith("seashell") ){
		  	this.show();
		  }
        })
        .catch((e) => console.error('Failed to fetch content:', e));
    }

    show() {
      this.view.innerHTML = this.content;

      const command =
        document.getElementById('extension-seashell-command');
      const run =
        document.getElementById('extension-seashell-run');
				
      const pre =
        document.getElementById('extension-seashell-response-data');
	  const content = 
		document.getElementById('extension-seashell-content');

      const restart =
        document.getElementById('extension-seashell-restart');

	  pre.innerText = "";

      run.addEventListener('click', () => {
		  
		  if( command.value.trim() != ''){ // Make sure the user inputted something. Python will also sanitize.
	        
			pre.innerHTML = "Running command...";
			window.API.postJson(
	          `/extensions/${this.id}/api/run`,
	          {'command': command.value}
	        ).then((body) => {
	          pre.innerHTML = body; //JSON.stringify(body, null, 2);
	        }).catch((e) => {
	          pre.innerText = e.toString();
	        });
		  }
      });
			
	  command.addEventListener('keypress', function (e) {
	      if (e.key === 'Enter') {
			  
	  		  if( command.value.trim() != ''){ // Make sure the user inputted something. Python will also sanitize.
	  	        
				pre.innerHTML = "Running command...";
				window.API.postJson(
	  	          `/extensions/seashell/api/run`,
	  	          {'command': command.value}
	  	        ).then((body) => {
	  	          pre.innerHTML = body; //JSON.stringify(body, null, 2);
	  	        }).catch((e) => {
	  	          pre.innerText = e.toString();
	  	        });
	  		  } 
			  
	      }
	  });
	
			
      restart.addEventListener('click', () => {
        //content.innerHTML = '<h2>Restarting...</h2><p>This page will reload automatically in 30 seconds. Or <a href="/" style="color:white">click here</a> to try now.</p>';
				
				
				pre.innerHTML = "Restarting..";
				
				window.API.postJson(
	  	          `/extensions/seashell/api/run`,
	  	          {'command': 'sudo systemctl restart mozilla-iot-gateway.service &'}
	  	        ).then((body) => {
	  	          //pre.innerHTML = body; //JSON.stringify(body, null, 2);
				  pre.innerHTML = "Restarting...";
	  	        }).catch((e) => {
	  	          //pre.innerText = e.toString();
				  pre.innerHTML = "Restarting...";
	  	        });
	  		   
				
				
				//window.API.postJson('/settings/system/actions', {action: 'restartSystem'}).catch(console.error);
				
				
				/*
				var getUrl = window.location;
				var baseUrl = getUrl .protocol + "//" + getUrl.host + "/things";
				
				setTimeout(function(){ 
					window.location.href = baseUrl;
				}, 30000);
				*/
      });

    }
  }

  new Seashell();

	
})();


