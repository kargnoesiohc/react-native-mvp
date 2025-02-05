/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import type {PropsWithChildren} from 'react';
import {
  AppRegistry,
  Button,
  SafeAreaView,
  useColorScheme,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';


import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

import {Platform, PermissionsAndroid } from 'react-native';
import { FirebaseMessagingTypes, getMessaging, requestPermission } from '@react-native-firebase/messaging';
  

import { name as appName } from './app.json';
// import { WebViewNavigationEvent } from 'react-native-webview/lib/RNCWebViewNativeComponent';
import Geolocation, { GeolocationOptions } from '@react-native-community/geolocation';

// import * as permissions from 'react-native-permissions';
import { request, requestMultiple, PERMISSIONS } from 'react-native-permissions'

//Geolocation 세밀한 설정 필요하면 설정
// Geolocation.setRNConfiguration({skipPermissionRequests: false});

// type SectionProps = PropsWithChildren<{
//   title: string;
// }>;


type PostMessageProps = {
  action: PostActionProps;
  payload?: Record<string, any>; // 객체 타입
  error?: Record<string, any>,
};

type ReceiveMessageProps = {
  action: ReceiveActionProps;
  payload?: Record<string, any>; // 객체 타입
};



// 앱 등록
AppRegistry.registerComponent(appName, () => App);

PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

//권한 요청 https://www.npmjs.com/package/react-native-permissions
// requestMultiple(Platform.OS === 'ios' ?
//   [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE, PERMISSIONS.IOS.CAMERA]
//   :
//   [PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO, PERMISSIONS.IOS.CAMERA])
//   .then((result) => {
//     console.log(result)
//   });





function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  
  const webviewRef = useRef<WebView>(null);
  //Geolocation 에서 watch 동작시 보관되는 watchId. 꼭 clearWatch해 줘야 함.
  const watchIdRef = useRef<number | null>(null);
  // const watchOptionsRef = useRef<GeolocationOptions|undefined>({
  //   interval: 5000,
  //   // timeout: 60000, (디폴트 600,000ms)
  //   maximumAge: 0,    //캐싱 X
  //   enableHighAccuracy: true, //높은 정확도 사용
  // });


useEffect(() => {
  // getFCMToken()

  // 백그라운드 메시지 핸들러 등록
  getMessaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('백그라운드 메시지 수신:', remoteMessage);
    
    const message = {
      action: 'SEND_BACKGROUND_NOTIFICATION',
      payload: {
        //커스텀 data
        data: remoteMessage.data,
        notification: remoteMessage.notification,
      },
    } as PostMessageProps;


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
    } as PostMessageProps;

    // 웹뷰에 데이터 전달
    postMessage(message);
  })



}, [])



// 웹뷰로 전달
function postMessage(message:PostMessageProps) {
  
  console.log('postMessage',message);
  if (webviewRef.current) {
    webviewRef.current.postMessage(JSON.stringify(message)); // 웹뷰로 메시지 전송
  }
}



///웹뷰로부터 받는 콜백
async function receiveMessage(event:WebViewMessageEvent) {

  
  //전체 정보
  console.log('receiveMessage event',event);

  //webview 에서 보내준 데이터는 event.nativeEvent.data: {action, payload} 로 JSON.stringify()로 되어있고, 꼭 JSON.parse() 해서 사용해야 함.
  const data = JSON.parse(event.nativeEvent.data) as ReceiveMessageProps;
  console.log('parsed data from webview', data)
  
  switch(data.action as ReceiveActionProps) {
    case 'REQUEST_NOTIFICATION': 
    requestPostNotificationsPermission();
      break;
    case 'FCM_TOKEN' :
      //현재위치 (일회성)
      await getFCMToken();
      break;
    case 'CURRENT_POSITION' :
      //현재위치 (일회성)
      getCurrentPosition();
      break;
    case 'START_WATCH_POSITION' :
      //디폴트 값
      const defaultGeolocationOptions = {
        interval: 5000,
        // timeout: 60000, (디폴트 600,000ms)
        maximumAge: 0,    //캐싱 X
        enableHighAccuracy: true, //높은 정확도 사용
      };
      //위치 watch 시작
      startWatchPosition(data.payload || defaultGeolocationOptions);
      break;

    case 'STOP_WATCH_POSITION' :
      //위치 watch 스톱
      stopWatchPosition();
      break;

    
  }
  
  // console.log(`action:${data.action}`, data.payload);
  


  // var data = event.nativeEvent.data;
  // console.log('data', data);
}


/****************************************************************************************************************/
/*********************************************함수들 START*********************************************************/
/****************************************************************************************************************/

//푸쉬 허용 요청
async function requestPostNotificationsPermission() {

    //카메라, 음성 허용
  requestCameraPermission();


  requestMultiple(Platform.OS === 'ios' ?
    [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE, PERMISSIONS.IOS.CAMERA]
    :
    [PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO, PERMISSIONS.IOS.CAMERA])
    .then((result) => {
      console.log(result)
    });
  
  

  if (Platform.OS === 'android') {

    //테스트(O)
    //테스트 결과 : 
    // * 한번 거부한 뒤로는 허용여부가 뜨지 않음. (앱을 재시작시 다시 될 것으로 보임)
    // * 거부된 상태에선 푸쉬가 알림목록엔 뜨지 않지만, 앱 내에 푸쉬결과는 정상적으로 전송됨. (백그라운드, 포그라운드 마찬가지)
    const permissionStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    postMessage({action: 'SEND_PERMISSION_STATUS', payload: {
      permissionStatus
    }})
  } else if(Platform.OS == 'ios') {
    //테스트(X)
    //iOS는 애플 개발자 키가 있어야 가능
    const authStatus = await getMessaging().messaging().requestPermission();
    const enabled =
      authStatus === getMessaging().messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === getMessaging().messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }

    //TODO postMessage()필요
  }

}


//카메라 허용 요청
async function requestCameraPermission() {


  requestMultiple(Platform.OS === 'ios' ?
    [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE]
    :
    [PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO])
    .then((result) => {
      console.log(result)
    });
}

///FCM Token 알아내기
async function getFCMToken() {
  try {
    // FCM 토큰 요청
    const token = await getMessaging().getToken();
    console.log('FCM Token:', token);

  postMessage({action: 'SEND_FCM_TOKEN', payload: {
    fcmToken: token
  }})

    return token;
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
  }
}

///현재 위치정보(일회성)
function getCurrentPosition() {
  Geolocation.getCurrentPosition((position) => {
    console.log({position})
    postMessage({action: 'SEND_CURRENT_POSITION', payload: position});
  }, (error) => {
    console.log('getCurrentPosition 에러', error);
    postMessage({action: 'SEND_CURRENT_POSITION', error});
  }, {
    // timeout: 50000, (위치 정보를 받을 때까지 대기 시간 : 디폴트 10분)
    maximumAge: 0,  //캐싱 X
    enableHighAccuracy: true, //높은 정확도 사용
  });
}

///위치정보 watch 시작
function startWatchPosition(geolocationOpeions?:GeolocationOptions) {
  //클리어
  stopWatchPosition();

  // console.log('startWatchPosition')

  //watch 실행
  watchIdRef.current = Geolocation.watchPosition(
    (position) => {
      // console.log('Current position:', position);
      postMessage({action: 'SEND_WATCH_POSITION', payload: position})
      // 위치가 갱신될 때마다 실행되는 코드
    },
    (error) => {
      // console.error('Error getting position:', error);
      postMessage({action: 'SEND_WATCH_POSITION', payload: {}, error});
    },
    geolocationOpeions,
  );
}

///위치정보 watch 끝(주의: startWatchGeolocation() 이후 페이지를 벗어나면 꼭 클리어 해 줘야 함)
function stopWatchPosition() {
  console.log(`stopWatchGeolocation ${watchIdRef.current}`)
  //클리어
  if(watchIdRef.current) {
    Geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }
}

/****************************************************************************************************************/
/*********************************************함수들 END***********************************************************/
/****************************************************************************************************************/


/*
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
*/

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
      } as PostMessageProps;
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

}

export default App;
