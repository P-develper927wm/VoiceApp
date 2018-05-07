/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  AppRegistry,
  TouchableHighlight,
  Platform,
  Permission
} from 'react-native';
import Voice from 'react-native-voice';
import Sound from 'react-native-sound';
import {AudioRecorder, AudioUtils} from 'react-native-audio';


type Props = {};
export default class App extends Component<Props> {
  constructor(props) {
    super(props);
    this.state = {
      recognized: '',
      pitch: '',
      error: '',
      end: '',
      started: '',
      results: [],
      partialResults: [],
      currentTime: 0.0,
      recording: false,
      stoppedRecording: false,
      paused: false,
      finished: false,
      audioPath: AudioUtils.DocumentDirectoryPath + '/test.aac',
      hasPermission: undefined,
      recordModal: false
    };
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
    Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged.bind(this);
    this._startRecognizing = this._startRecognizing.bind(this)
  }
  componentDidMount(){
    this._startRecognizing()
    this._checkPermission().then((hasPermission) => {
        this.setState({ hasPermission });

        if (!hasPermission) return;

        this.prepareRecordingPath(this.state.audioPath);

        AudioRecorder.onProgress = (data) => {
          this.setState({currentTime: Math.floor(data.currentTime)});
        };

        AudioRecorder.onFinished = (data) => {
         
            this._finishRecording(data.status === "OK", data.audioFileURL);
          
        };
      });
      
  }
  _checkPermission() {
      if (Platform.OS !== 'android') {
        return Promise.resolve(true);
      }
    }
  componentWillUnmount() {
    Voice.destroy().then(Voice.removeAllListeners);
  }
  prepareRecordingPath(audioPath){
    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: 'Low',
      AudioEncoding: 'aac',
      AudioEncodingBitRate: 32000
    })
  }
  async _pause() {
      if (!this.state.recording) {
        console.warn('Can\'t pause, not recording!');
        return;
      }

      try {
        const filePath = await AudioRecorder.pauseRecording();
        this.setState({paused: true});
      } catch (error) {
        console.error(error);
      }
    }

    async _resume() {
      if (!this.state.paused) {
        console.warn('Can\'t resume, not paused!');
        return;
      }

      try {
        await AudioRecorder.resumeRecording();
        this.setState({paused: false});
      } catch (error) {
        console.error(error);
      }
    }

    async _stop() {
      if (!this.state.recording) {
        console.warn('Can\'t stop, not recording!');
        return;
      }

      this.setState({stoppedRecording: true, recording: false, paused: false});

      try {
        const filePath = await AudioRecorder.stopRecording();

        if (Platform.OS === 'android') {
          this._finishRecording(true, filePath);
        }
        return filePath;
      } catch (error) {
        console.error(error);
      }
    }

    async _play() {
      if (this.state.recording) {
        await this._stop();
      }

      // These timeouts are a hacky workaround for some issues with react-native-sound.
      // See https://github.com/zmxv/react-native-sound/issues/89.
      setTimeout(() => {
        var sound = new Sound(this.state.audioPath, '', (error) => {
          if (error) {
            console.log('failed to load the sound', error);
          }
        });

        setTimeout(() => {
          sound.play((success) => {
            if (success) {
              console.log('successfully finished playing');
            } else {
              console.log('playback failed due to audio decoding errors');
            }
          });
        }, 100);
      }, 100);
    }

    async _record() {
      if (this.state.recording) {
        console.warn('Already recording!');
        return;
      }

      if (!this.state.hasPermission) {
        console.warn('Can\'t record, no permission granted!');
        return;
      }

      if(this.state.stoppedRecording){
        this.prepareRecordingPath(this.state.audioPath);
      }

      this.setState({recording: true, paused: false});

      try {
        const filePath = await AudioRecorder.startRecording();
      } catch (error) {
        console.error(error);
      }
    }

    _finishRecording(didSucceed, filePath) {
      this.setState({ finished: didSucceed });
      console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
    }

  onSpeechStart(e) {
    this.setState({
      started: '√',
    });
  }

  onSpeechRecognized(e) {
    this.setState({
      recognized: '√',
    });
  }

  onSpeechEnd(e) {
    this.setState({
      end: '√',
    });
  }

  onSpeechError(e) {
    this.setState({
      error: JSON.stringify(e.error),
    });
  }

  onSpeechResults(e) {
    this.setState({
      results: e.value,
    });
    let length=this.state.results[0].split(' ').length
    console.log('++',length,e.value[0].split(' ')[length-1])
   
      if(e.value[0].split(' ')[length-1].toLowerCase()==='start') this._record()
      if(e.value[0].split(' ')[length-1].toLowerCase()==='stop') this._stop()
      if(e.value[0].split(' ')[length-1].toLowerCase()==='play') {
        this._stopRecognizing.bind(this)
        this._play()
      }
    
    
  }

  onSpeechPartialResults(e) {
    this.setState({
      partialResults: e.value,
    });
  }

  onSpeechVolumeChanged(e) {
    this.setState({
      pitch: e.value,
    });
  }

  async _startRecognizing(e) {
    
    this.setState({
      recognized: '',
      pitch: '',
      error: '',
      started: '',
      results: [],
      partialResults: [],
      end: ''
    });
    // this._resume()
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  }

  async _stopRecognizing(e) {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  }

  async _cancelRecognizing(e) {
    try {
      await Voice.cancel();
    } catch (e) {
      console.error(e);
    }
  }

  async _destroyRecognizer(e) {
    try {
      await Voice.destroy();
    } catch (e) {
      console.error(e);
    }
    this.setState({
      recognized: '',
      pitch: '',
      error: '',
      started: '',
      results: [],
      partialResults: [],
      end: ''
    });
  }
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native Voice!
        </Text>
        {/* <Text style={styles.instructions}>
          Press the button and start speaking.
        </Text> */}
        <Text
          style={styles.stat}>
          {`Started: ${this.state.started}`}
        </Text>
        {/* <Text
          style={styles.stat}>
          {`Recognized: ${this.state.recognized}`}
        </Text>
        <Text
          style={styles.stat}>
          {`Pitch: ${this.state.pitch}`}
        </Text>
        <Text
          style={styles.stat}>
          {`Error: ${this.state.error}`}
        </Text> */}
        <Text
          style={styles.stat}>
          Results
        </Text>
        {this.state.results.map((result, index) => {
          return (
            <Text
              key={`result-${index}`}
              style={styles.stat}>
              {result}
            </Text>
          )
        })}
        
        {/* <Text
          style={styles.stat}>
          {`End: ${this.state.end}`}
        </Text>
        <TouchableHighlight onPress={this._startRecognizing.bind(this)}>
          <Image
            style={styles.button}
            source={require('./button.png')}
          />
        </TouchableHighlight> */}
        {/* <TouchableHighlight onPress={this._stopRecognizing.bind(this)}>
          <Text
            style={styles.action}>
            Stop Recognizing
          </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={this._cancelRecognizing.bind(this)}>
          <Text
            style={styles.action}>
            Cancel
          </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={this._destroyRecognizer.bind(this)}>
          <Text
            style={styles.action}>
            Destroy
          </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={()=>this._record()}>
          <Text
            style={[styles.action,{color:'red'}]}>
            Record
          </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={()=>this._stop()}>
          <Text
            style={[styles.action,{color:'orange'}]}>
            stop
          </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={()=>this._play()}>
          <Text
            style={[styles.action,{color:'green'}]}>
            play
          </Text>
        </TouchableHighlight> */}
        
      </View>
    
    );
  }
}

const styles = StyleSheet.create({
   button: {
    width: 50,
    height: 50,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  action: {
    textAlign: 'center',
    color: '#0000FF',
    marginVertical: 5,
    fontWeight: 'bold',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  stat: {
    textAlign: 'center',
    color: '#B0171F',
    marginBottom: 1,
  },
});
