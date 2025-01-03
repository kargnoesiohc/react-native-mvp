/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef } from 'react';
import type {PropsWithChildren} from 'react';
import {
  AppRegistry,
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';


import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {PermissionsAndroid} from 'react-native';
import { FirebaseMessagingTypes, getMessaging } from '@react-native-firebase/messaging';
  PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

import { name as appName } from './app.json';
import { WebViewNavigationEvent } from 'react-native-webview/lib/RNCWebViewNativeComponent';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

type ActionProps = 'TEST' | 'SEND_BACKGROUND_NOTIFICATION' | 'SEND_FOREGROUND_NOTIFICATION';
type MessageProps = {
  action: ActionProps;
  payload: Record<string, any>; // 객체 타입
};

// 앱 등록
AppRegistry.registerComponent(appName, () => App);

const HTML = `<!DOCTYPE html>\n
<html>
  <head>
    <title>Messaging</title>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=320, user-scalable=no">
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
        font: 62.5% arial, sans-serif;
        background: #ccc;
      }
    </style>
  </head>
  <body>
    <button onclick="sendPostMessage()">Send post message from JS to WebView</button>
    <p id="demo"></p>    
    <p id="test">Nothing received yet</p>

    <script>
      function sendPostMessage() {
        window.ReactNativeWebView.postMessage('Message from JS');
      }

      window.addEventListener('message',function(event){
        document.getElementById('test').innerHTML = event.data;
        console.log("Message received from RN: ",event.data);
      },false);
      document.addEventListener('message',function(event){
        document.getElementById('test').innerHTML = event.data;
        console.log("Message received from RN: ",event.data);
      },false);

    </script>
  </body>
</html>`;



function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

const runFirst = `
  window.alert('hi');
`
const injectedJavascript = `(function() {
  window.postMessage = function(data) {
window.ReactNativeWebView.postMessage(data);
};
})()`



function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  
  const webviewRef = useRef<WebView>(null);


useEffect(() => {
  getFCMToken()

  // 백그라운드 메시지 핸들러 등록
  getMessaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('백그라운드 메시지 수신:', remoteMessage);
    
    const message = {
      action: 'SEND_BACKGROUND_NOTIFICATION',
      payload: {
        //커스텀 data
        data: remoteMessage.data,
        notification: remoteMessage.notification,
      }
    } as MessageProps;


    // 웹뷰에 데이터 전달
    postMessage(message);

  });

  getMessaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('포그라운드 메시지 수신:', remoteMessage);

    const message = {
      action: 'SEND_FOREGROUND_NOTIFICATION',
      payload: {
        //커스텀 data
        data: remoteMessage.data,
        notification: remoteMessage.notification,
      }
    } as MessageProps;

    // 웹뷰에 데이터 전달
    postMessage(message);
  })


}, [])


// // 웹뷰로 전달
// function postMessage(data:any) {
  
//   console.log('sendMessage',data);
//   if (webviewRef.current) {
//     webviewRef.current.postMessage(JSON.stringify(data)); // 웹뷰로 메시지 전송
//   }
// }

// 웹뷰로 전달
function postMessage(message:MessageProps) {
  
  console.log('sendMessage',message);
  if (webviewRef.current) {
    webviewRef.current.postMessage(JSON.stringify(message)); // 웹뷰로 메시지 전송
  }
}


///웹뷰로부터 받는 콜백
function receiveMessage(event:WebViewMessageEvent) {
  console.log('receiveMessage',event, event.nativeEvent.data);
}

///FCM Token 알아내기
async function getFCMToken() {
  try {
    // FCM 토큰 요청
    const token = await getMessaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
  }
}

const onLoadHandler = ({ nativeEvent }:any ) => {
  console.log('onLoadHandler=====================');
  if (!nativeEvent.url.startsWith("http")) {
    if(webviewRef.current != null) {
      const js = `
        window.ReactNativeWebView.postMessage("");
      `;
      webviewRef.current.injectJavaScript(js);
    }
    
  }
};


  return(
  
    <SafeAreaView style={{ flex: 1 }}>
  <View style={{flex:1}}>
    <Button title='웹뷰로 보내기' onPress={()=>{
      const message = {
        action: 'TEST',
        payload: {
          id: 1234,
          name: 'jaden',
          addr: '인덕원',
        }
      } as MessageProps;
      postMessage(message);
    }} />
    <WebView
      ref={webviewRef}
      // onLoad={onLoadHandler}
      originWhitelist={['*']}
      //주의: localhost를 사용할 경우, 앱의 로컬호스트를 의미함
      source={{ uri: 'http://192.168.0.173:3000/'}}
      // source={{ uri: 'https://react-native-esbuild.vercel.app/troubleshooting/new-architecture'}}
      
      // source={{ html: HTML}}
      onMessage={receiveMessage}
      // injectedJavaScript={injectedJavascript}
      javaScriptEnabled={true}  // 자바스크립트 활성화
      domStorageEnabled={true}  // DOM Storage 활성화
      cacheEnabled={false}
      /*
        웹 페이지가 카메라, 마이크, 또는 화면 공유와 같은 미디어 캡처 권한을 요청할 때, 권한 허용 방식에 대해 설정
        'grant': 특정 웹 페이지에서 카메라, 마이크, 또는 화면 공유와 같은 미디어 캡처 요청에 대해 자동으로 권한을 허용
        'grantIfSameHostElsePrompt': 동일한 호스트의 요청은 자동으로 허용, 그렇지 않으면 사용자에게 묻기.
        'grantIfSameHostElseDeny': 동일한 호스트의 요청만 자동 허용, 다른 요청은 거부.
        'deny': 모든 요청 거부.
        'prompt': 항상 사용자에게 묻기.
      */
      mediaCapturePermissionGrantType={'grant'} 
      /*
        특정 URL이 로드되기 전에 이를 허용하거나 차단할지 결정하는 함수.
        함수에서 true를 반환하면 요청이 허용되고, false를 반환하면 차단됩니다.
        주로 특정 URL이나 도메인을 제한하거나 제어할 때 유용합니다.
      */
      // onShouldStartLoadWithRequest={(event) => {
      //   console.log("onShouldStartLoadWithRequest", event);
      //   return true;
      // }}
      // onLoadStart={(event) => {
      //   console.log("onLoadStart", event.nativeEvent);
      // }}
    />
  </View>
  </SafeAreaView>
  )

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        {/* <Header /> */}
        
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
            
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
