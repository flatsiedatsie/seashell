"""Shelkly API handler."""


import functools
import json
import os
from time import sleep
import datetime
import subprocess


try:
    from gateway_addon import APIHandler, APIResponse
    #print("succesfully loaded APIHandler and APIResponse from gateway_addon")
except:
    print("Import APIHandler and APIResponse from gateway_addon failed. Use at least WebThings Gateway version 0.10")

print = functools.partial(print, flush=True)


class SeashellAPIHandler(APIHandler):
    """Seashell API handler."""

    def __init__(self, verbose=False):
        """Initialize the object."""
        #print("INSIDE API HANDLER INIT")
        try:
            manifest_fname = os.path.join(
                os.path.dirname(__file__),
                '..',
                'manifest.json'
            )            
            #self.adapter = adapter
            #print("ext: self.adapter = " + str(self.adapter))

            print("Starting Seashell")

            with open(manifest_fname, 'rt') as f:
                manifest = json.load(f)

            APIHandler.__init__(self, manifest['id'])
            self.manager_proxy.add_api_handler(self)
            
            self.DEBUG = False
            
            if self.DEBUG:
                print("self.manager_proxy = " + str(self.manager_proxy))
                print("Created new API HANDLER: " + str(manifest['id']))
        except Exception as e:
            print("Failed to init UX extension API handler: " + str(e))
        
        

    def handle_request(self, request):
        """
        Handle a new API request for this handler.

        request -- APIRequest object
        """
        
        try:
        
            if request.method != 'POST':
                print("Warning: received non-post request")
                return APIResponse(status=404)
            
            if request.path == '/run' or request.path == '/restart':

                try:
                   
                        
                    
                    if request.path == '/run':
                        try:
                            run_result = self.run(str(request.body['command']))
                            return APIResponse(
                              status=200,
                              content_type='application/json',
                              content=json.dumps(run_result),
                            )
                        except Exception as ex:
                            print("Error running command: " + str(ex))
                            return APIResponse(
                              status=500,
                              content_type='application/json',
                              content=json.dumps("Error running command: " + str(ex)),
                            )
                            
                        
                    elif request.path == '/restart':
                        self.restart()
                        return APIResponse(
                          status=200,
                          content_type='application/json',
                          content=json.dumps("Restarting"),
                        )
                    else:
                        return APIResponse(
                          status=500,
                          content_type='application/json',
                          content=json.dumps("API error"),
                        )
                        
                except Exception as ex:
                    print(str(ex))
                    return APIResponse(
                      status=500,
                      content_type='application/json',
                      content=json.dumps("Error"),
                    )
                    
            else:
                return APIResponse(status=404)
                
        except Exception as e:
            print("Failed to handle UX extension API request: " + str(e))
            return APIResponse(
              status=500,
              content_type='application/json',
              content=json.dumps("API Error"),
            )
        
    def run(self, command):
        print("Running new command: " + str(command))
        
        try:
            #os.system(command)
            run_result = run_command(command)
            print("run result = " + str(run_result))
            return run_result.replace('\n', '<br />')
        except Exception as e:
            print("Error running command: " + str(e))


    def restart(self):
        print("Restarting gateway")
        try:
            os.system('sudo systemctl restart mozilla-iot-gateway.service &') 
        except Exception as e:
            print("Error rebooting: " + str(e))



    def unload(self):
        if self.DEBUG:
            print("Shutting down Seashell adapter")



def run_command(cmd, timeout_seconds=60):
    try:
        
        p = subprocess.run(cmd, timeout=timeout_seconds, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, universal_newlines=True)

        if p.returncode == 0:
            return p.stdout  + '\n' + "Command success" #.decode('utf-8')
            #yield("Command success")
        else:
            if p.stderr:
                return "Error: " + str(p.stderr)  + '\n' + "Command failed"   #.decode('utf-8'))

    except Exception as e:
        print("Error running command: "  + str(e))
        