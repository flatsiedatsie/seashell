(function() {
  class Seashell extends window.Extension {
    constructor() {
      super('seashell');
      this.addMenuEntry('Seashell');

	  this.recent_commands = [];
	  this.received_messages = [];
	  
	  this.debug = true;
	  
	  this.waiting_for_poll_response = 0;
	  
	  this.recent_commands_index = 0;
	  
	  let stored_commands = localStorage.getItem("extension_seashell_recent_commands");
	  if(typeof stored_commands == 'string'){
		  this.recent_commands = JSON.parse(stored_commands)
	  }
	  
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
        if(this.content == ''){
			//console.log("- show: empty content, aborting");
			return;
        }
		
        this.view.innerHTML = this.content;

		const history_button_el = this.view.querySelector('#extension-seashell-history-button');
        const command_el = this.view.querySelector('#extension-seashell-command');
		const pipe_button_el = this.view.querySelector('#extension-seashell-pipe-buton');
        const run_button_el = this.view.querySelector('#extension-seashell-run-button');
        const pre = this.view.querySelector('#extension-seashell-response-data');
		const content = this.view.querySelector('#extension-seashell-content');
        //const restart_button_el = this.view.querySelector('#extension-seashell-restart-button');
		
		const recent_commands_el = this.view.querySelector('#extension-seashell-recent-commands');
		
		if(pre == null){
    		console.error("seashell show: missing HTML elements? aborting");
    		return
		}
	  
	  	history_button_el.addEventListener('click', () => {
			console.log("seashell: clicked on history button");
			if(recent_commands_el.classList.contains('extension-seashell-hidden')){
				recent_commands_el.classList.remove('extension-seashell-hidden');
			}
			else{
				recent_commands_el.classList.add('extension-seashell-hidden');
			}
        });
	  
	  	pipe_button_el.addEventListener('click', () => {
			command_el.value = command_el.value + ' | ';
        });
	  
        run_button_el.addEventListener('click', () => {
			this.run_command(command_el.value);
			command_el.value = '';
        });
		
		command_el.addEventListener('keypress', function (e) {
			if (e.key === 'Enter') {
				this.run_command(command_el.value);
				command_el.value = '';
			}
		});
		
		command_el.addEventListener('keypress', function (e) {
			if (e.key === 'ArrowUp') {
				
				if(this.recent_commands.length){
					this.recent_commands_index++;
					if(this.recent_commands_index >= this.recent_commands.length){
						this.recent_commands_index = 0;
						command_el.value = ''
					}
					else{
						command_el.value = this.recent_commands[ this.recent_commands.length - this.recent_commands_index ];
					}
					console.log("this.recent_commands_index: ", this.recent_commands_index);
				}
				
			}
			if (e.key === 'ArrowDown') {
				
				if(this.recent_commands.length){
					this.recent_commands_index--;
					if(this.recent_commands_index <= 0){
						this.recent_commands_index = 0;
					}
					else{
						command_el.value = this.recent_commands[ this.recent_commands.length - this.recent_commands_index ];
					}
					console.log("this.recent_commands_index: ", this.recent_commands_index);
				}
				
			}
		});
		
		/*
      	restart.addEventListener('click', () => {
        	//content.innerHTML = '<h2>Restarting...</h2><p>This page will reload automatically in 30 seconds. Or <a href="/" style="color:white">click here</a> to try now.</p>';
		
			pre.innerHTML = "Restarting..";
		
			window.API.postJson(
          		`/extensions/seashell/api/run`,
          		{'command': 'sudo systemctl restart webthings-gateway.service &'}
        	).then((body) => {
          	//pre.innerHTML = body; //JSON.stringify(body, null, 2);
		  	pre.textContent = "Restarting...";
        	}).catch((e) => {
		  	pre.textContent = "Restarting...";
			);
		
      	});
		*/
	  
	  
		let content_el = this.view.querySelector('#extension-seashell-content-container');
		if(content_el){
			let timers_counter = 0;
			content_el.poll_interval = setInterval(() => {
			
				if( !document.location.href.endsWith("extensions/seashell") ){
					if(this.debug){
						console.log("seashell debug: user navigated away from Seashell addon. Stopping Seashell interval");
					}
					clearInterval(content_el.poll_interval);
					this.view.innerHTML = '';
					return
				}
				
				
				timers_counter++;
				if(timers_counter > 30){
					timers_counter = 0;
					if(this.waiting_for_poll_response){
						//this.waiting_for_poll_response = false;
					}
				}
				if(this.waiting_for_poll_response == 0){
					this.do_poll();
				}
				else{
					this.waiting_for_poll_response++;
					if(this.debug){
						console.log("seashell debug: waiting_for_poll_response: ", this.waiting_for_poll_response);
					}
				}
			
			},1000);
		}
	  
	  	this.generate_recent_commands_list();

    }
	
	
	run_command(command){
		if( typeof command == 'string' && command.trim() != ''){ // Make sure the user inputted something. Python will also sanitize.
	    	
			if(this.debug){
				console.log("in run_command.  command: ", command);
			}
			
			if(this.recent_commands.indexOf(command) == -1){
				this.recent_commands.push(command);
				this.generate_recent_commands_list(); // also limits the length to 10 commands
				localStorage.setItem("extension_seashell_recent_commands", JSON.stringify(this.recent_commands));
			}
			
			const pre = this.view.querySelector('#extension-seashell-response-data');
			pre.innerHTML = "Running command...";
			
			this.generate_messages([{'timestamp':Date.now()/1000,'type':'stdin','content':command}]);
			
			window.API.postJson(
		          `/extensions/seashell/api/run`,
		          {'command': command}
		    )
			.then((body) => {
				pre.innerHTML = body; //JSON.stringify(body, null, 2);
		    }).catch((e) => {
				pre.textContent = e.toString();
		    });
		}
		else{
			if(this.debug){
				console.error("seashell debug: run_command: invalid command provided: ", typeof comamnd, command);
			}
		}
		
		this.recent_commands_index = 0;
		const message_container_el = this.view.querySelector('#extension-seashell-messages-container');
		if(message_container_el){
			message_container_el.scrollTop = message_container_el.scrollHeight;
		}
		
	}
	
	
	do_poll(){
		if(this.debug){
			//console.log("seashell debug: in do_poll");
		}
		
		if(document.hidden || document.msHidden || document.webkitHidden || document.mozHidden){
			return
		}
		
		this.waiting_for_poll_response++;
		
		window.API.postJson(`/extensions/seashell/api/poll`)
		.then((body) => {
			this.waiting_for_poll_response = 0;
			if(this.debug){
				//console.log("seashell debug: poll response: ", body);
			}
			if(typeof body.messages != 'undefined'){
				this.generate_messages(body.messages);
			}
			
			
		})
		.catch((err) => {
			this.waiting_for_poll_response = 0;
			if(this.debug){
				console.error("seashell debug: caught error calling polling api ", err);
			}
			const pre = this.view.querySelector('#extension-seashell-response-data');
			if(pre){
				pre.textContent = e.toString();
			}
		});

	}
	
	
	generate_messages(messages=[]){
		if(this.debug){
			//console.log("seashell debug: in generate_messages.  messages: ", messages);
		}
		try{
			if(typeof messages != 'undefined' && Array.isArray(messages) && messages.length){
				const message_container_el = this.view.querySelector('#extension-seashell-messages-container');
				for(let m = 0; m < messages.length; m++){
					if(this.debug){
						console.log("seashell debug: message ", messages[m]);
					}
					if(typeof messages[m]['type'] == 'string' && typeof messages[m]['content'] == 'string'){
					
						let message_el = document.createElement('div');
						message_el.classList.add('extension-seashell-message');
					
						message_el.classList.add('extension-seashell-message-' + messages[m]['type']);
					
						message_el.textContent = messages[m]['content'];
					
						message_container_el.prepend(message_el);
					}
				
				}
			}
		}
		catch(err){
			if(this.debug){
				console.error("seashell debug: caught error in generate_messages: ", err);
			}
		}
		
	}
	
	
	generate_recent_commands_list(){
		if(this.recent_commands.length){
			
			const recent_commands_el = this.view.querySelector('#extension-seashell-recent-commands');
			const command_el = this.view.querySelector('#extension-seashell-command');
			
			recent_commands_el.innerHTML = '';
		
			while (this.recent_commands.length > 10){
				if(this.debug){
					console.log("seashell debug: pruning old recent command: ", this.recent_commands[0] );
				}
				this.recent_commands.shift();
			}
		
			for(let rc = 0; rc < this.recent_commands.length; rc++){
			
				let command_item_el = document.createElement('div');
				command_item_el.classList.add('extension-seashell-recent-command-item');
				
				let command_item_text_el = document.createElement('div');
				command_item_text_el.classList.add('extension-seashell-recent-command-item-text');
				command_item_text_el.textContent = this.recent_commands[rc];
				command_item_text_el.addEventListener('click', () => {
					recent_commands_el.classList.add('extension-seashell-hidden');
					command_el.value = this.recent_commands[rc];
				});
				command_item_el.appendChild(command_item_text_el);
				
				let command_item_run_el = document.createElement('div');
				command_item_run_el.classList.add('extension-seashell-recent-command-item-run-button');
				command_item_run_el.textContent = 'Run';
				command_item_run_el.addEventListener('click', () => {
					recent_commands_el.classList.add('extension-seashell-hidden');
					this.run_command(this.recent_commands[rc]);
				});
				command_item_el.appendChild(command_item_run_el);
				
				recent_commands_el.appendChild(command_item_el);
				
				
				
			}
		}
	}
	
	
	
  }

  new Seashell();

	
})();


