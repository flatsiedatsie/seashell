"""Seashell API handler."""


import os
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
import json
#from time import sleep
import time
import functools
import datetime
import subprocess
import threading

try:
    from gateway_addon import APIHandler, APIResponse
    #print("succesfully loaded APIHandler and APIResponse from gateway_addon")
except:
    print("Import APIHandler and APIResponse from gateway_addon failed. Use at least WebThings Gateway version 0.10")

print = functools.partial(print, flush=True)



_TIMEOUT = 3

_CONFIG_PATHS = [
    os.path.join(os.path.expanduser('~'), '.webthings', 'config'),
]

if 'WEBTHINGS_HOME' in os.environ:
    _CONFIG_PATHS.insert(0, os.path.join(os.environ['WEBTHINGS_HOME'], 'config'))



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

            #print("Starting Seashell")

            with open(manifest_fname, 'rt') as f:
                manifest = json.load(f)


            self.messages = []
            
            self.DEBUG = False
            
            self.running = True
            
            
            APIHandler.__init__(self, manifest['id'])
            self.manager_proxy.add_api_handler(self)
            
            
            
            
            
            if self.DEBUG:
                print("self.manager_proxy = " + str(self.manager_proxy))
                print("Created new API HANDLER: " + str(manifest['id']))
        except Exception as e:
            print("Failed to init UX extension API handler: " + str(e))
        
        self.shell = None

        
        
        
        

    def handle_request(self, request):
        """
        Handle a new API request for this handler.

        request -- APIRequest object
        """
        
        try:
        
            if request.method != 'POST':
                print("Warning: received non-post request")
                return APIResponse(status=404)
            
            if request.path == '/run' or request.path == '/restart' or request.path == '/poll':

                if self.DEBUG:
                    print("API got request at: " + str(request.path))

                try:
                   
                    if request.path == '/run':
                        state = False
                        latest_messages = []
                        try:
                            if 'command' in request.body:
                                self.run(str(request.body['command']))
                            
                                latest_messages = self.messages
                                self.messages = []
                            
                                state = True
                            
                            return APIResponse(
                              status=200,
                              content_type='application/json',
                              content=json.dumps({'state':state,'messages':latest_messages}),
                            )
                        except Exception as ex:
                            if self.DEBUG:
                                print("caught error running command: " + str(ex))
                            return APIResponse(
                              status=500,
                              content_type='application/json',
                              content=json.dumps({'state':False,'message':'Error running command: ' + str(ex)}),
                            )
                            
                    elif request.path == '/poll':
                        latest_messages = self.messages.copy()
                        self.messages = []
                        return APIResponse(
                          status=200,
                          content_type='application/json',
                          content=json.dumps({'state':True,'messages':latest_messages}),
                        )
                        
                    elif request.path == '/restart':
                        self.restart()
                        return APIResponse(
                          status=200,
                          content_type='application/json',
                          content=json.dumps({'state':True,'message':'Restarting'}),
                        )
                        
                    else:
                        return APIResponse(
                          status=500,
                          content_type='application/json',
                          content=json.dumps({'state':False,'message':'invalid api endpoint'}),
                        )
                        
                except Exception as ex:
                    if self.DEBUG:
                        print("caught general error in api: " + str(ex))
                    return APIResponse(
                      status=500,
                      content_type='application/json',
                      content=json.dumps({'state':False,'message':'500 - caught error'}),
                    )
                    
            else:
                return APIResponse(status=404)
                
        except Exception as e:
            print("Failed to handle UX extension API request: " + str(e))
            return APIResponse(
              status=500,
              content_type='application/json',
              content=json.dumps({'state':False,'message':'500 - caught general API error'}),
            )
        
        
        
        
    def run(self, command=None):
        
        
        """
        try:
            if self.shell == None:
                 print("Starting SSH connection first")
                 ssh_cmd = 'ssh -vvv -i your_ssh_key -o BatchMode=yes -p 22 user@server_address 2> /dev/null'
                 subprocess.run(ssh_cmd, shell=True)

        except subprocess.CalledProcessError as e:
             raise SystemExit(e)
        """
        
        
        
        try:
            
            if command == None:
                print("run: error, no (valid) command provided")
                return
            
            if self.DEBUG:
                print("run: command: " + str(command))
            
            #if self.shell == None:
            #    self.shell = subprocess.Popen(['/bin/bash'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
            
            if self.shell == None:
                self.shell = subprocess.Popen(["bash"], stderr=subprocess.PIPE, shell=False, stdin=subprocess.PIPE, stdout=subprocess.PIPE)

                def read_stdout():
                    while self.running:
                        msg = self.shell.stdout.readline()
                        #print("stdout: ", msg.decode())
                        self.messages.append({'type':'stdout','content':msg.decode()})
                        #print("messages length after: " + str(len(self.messages)))
                        time.sleep(0.0001)
                    if self.DEBUG:
                        print("read_stdout closed")

                def read_stderr():
                    while self.running:
                        msg = self.shell.stderr.readline()
                        #print("stderr: ", msg.decode())
                        self.messages.append({'type':'stderr','content':msg.decode()})
                        #print("messages length after: " + str(len(self.messages)))
                        time.sleep(0.0001)
                    if self.DEBUG:
                        print("read_stderr closed")

                self.stdout_thread = threading.Thread(target=read_stdout)
                self.stdout_thread.daemon = True
                self.stdout_thread.start()
                
                self.stderr_thread = threading.Thread(target=read_stderr)
                self.stderr_thread.daemon = True
                self.stderr_thread.start()

            #print("messages length before: " + str(len(self.messages)))
            #if len(self.messages):
            #    print("last message appended before: " + str(self.messages[ len(self.messages) - 1]))
            #self.messages.append({'timestamp':time.time(),'type':'stdin','content':str(command)})
            #if len(self.messages):
            #    print("last message appended after: " + str(self.messages[ len(self.messages) - 1]))
            #print("messages length after: " + str(len(self.messages)))
            
            #time.sleep(0.0001)
            
            self.shell.stdin.write((str(command) + '\n').encode())
            self.shell.stdin.flush()
                
            #os.system(command)
            #stdout = proc.communicate('ls -lash')
            #run_result = self.shell.communicate(command)
            #run_result = run_command(command)
            #print("run result = " + str(run_result))
            #return run_result.replace('\n', '<br />')
        except Exception as ex:
            print("caught error in run: " + str(ex))


    def restart(self):
        if self.DEBUG:
            print("Restarting gateway")
        try:
            self.messages.append({'timestamp':time.time(),'type':'meta','content':'-- RESTARTING CANDLE CONTROLLER --'})
            
            os.system('sudo systemctl restart webthings-gateway.service &') 
        except Exception as e:
            print("Error rebooting: " + str(e))



    def unload(self):
        if self.DEBUG:
            print("Shutting down Seashell adapter")
        self.running = False
        return True


def run_command(cmd, timeout_seconds=60):
    try:
        
        p = subprocess.run(cmd, timeout=timeout_seconds, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, universal_newlines=True)

        if p.returncode == 0:
            return p.stdout  + '\n' + "Command success" #.decode('utf-8')
            #yield("Command success")
        else:
            if p.stderr:
                return "Error: " + str(p.stderr)  + '\n' + "Command failed"   #.decode('utf-8'))

    except Exception as ex:
        print("Error running command: "  + str(ex))
        