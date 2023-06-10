/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  ToastAndroid,
  Text,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {Button, NavBar} from 'galio-framework';
import RNShake from 'react-native-shake';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/Feather';
import Contacts from 'react-native-contacts';
import {PermissionsAndroid} from 'react-native';
import {List} from 'react-native-paper';
import SmsAndroid from 'react-native-get-sms-android';
import RNImmediatePhoneCall from 'react-native-immediate-phone-call';
import Logo from './assets/logo.jpeg';
import AsyncStorage from '@react-native-community/async-storage';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import AnimatedLoader from 'react-native-animated-loader';
const URL = 'https://avionics-academy.herokuapp.com';
const ContactList = (props) => {
  const {contacts, removeNumber} = props;

  return (
    <>
      {contacts.map((contact, i) => (
        <List.Item
          title={contact.label}
          description={contact.value}
          key={i}
          onPress={() => {
            removeNumber(i);
          }}
          style={{backgroundColor: '#fff', marginBottom: 10, borderRadius: 10}}
          left={(props) => <List.Icon {...props} icon="phone" />}
          right={(props) => (
            <List.Icon style={{color: 'red'}} {...props} icon="close" />
          )}
        />
      ))}
    </>
  );
};

const App = () => {
  const [contact, setContact] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [saveInitate, setSaveInitate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState('');
  let controller;
  const askPermissions = async () => {
    let status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    );
    console.log(status);
  };
  useEffect(() => {
    askPermissions();
  }, []);
  const showToast = (msg) => {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  };
  const fetchContacts = async () => {
    const getList = async () => {
      let _contacts = await Contacts.getAll().catch((error) => {
        console.log(error.message);
      });
      let arr = [];
      for (const con of _contacts) {
        if (con.givenName && con.phoneNumbers?.length) {
          arr.push({
            label: con.displayName ?? con.givenName,
            value: con.phoneNumbers[0].number,
            icon: () => <Icon name="phone" size={18} color="#000" />,
          });
        }
      }
      arr = arr.filter(
        (thing, index, self) =>
          index ===
          self.findIndex(
            (t) => t.value === thing.value && t.value === thing.value,
          ),
      );
      setAllContacts(arr);
      // if (arr.length) setContact(arr[0].value);
      // controller.open();
    };
    let status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    );
    if (status === 'denied' || status === 'never_ask_again') {
      alert('Permissions not granted to access Contacts');
    } else {
      getList();
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);
  const _makeCall = (phoneNumber) => {
    RNImmediatePhoneCall.immediatePhoneCall(phoneNumber);
  };
  useEffect(() => {
    console.log('effect', selectedContacts);
    if (selectedContacts && selectedContacts.length) {
      setLoading(false);
      RNShake.addEventListener('ShakeEvent', () => {
        console.log('shaked');
        if (selectedContacts && selectedContacts.length) {
          if (!saveInitate) setSaveInitate(true);
        } else {
          showToast('Please wait for loading....');
        }
      });
      return () => {
        RNShake.removeEventListener('ShakeEvent');
      };
    }
  }, [selectedContacts]);
  const alertPeaples = async () => {
    console.log('Saving initiate', selectedContacts);
    for (const savers of selectedContacts) {
      let phoneNumber = savers.value;
      let message = 'help me iam trap';
      try {
        SmsAndroid.autoSend(
          phoneNumber,
          message,
          (fail) => {
            setSaveInitate(false);
            showToast('SMS sent failed trigger call');
            console.log('Failed with this error: ' + fail);
            _makeCall(phoneNumber);
          },
          (success) => {
            showToast('SMS sent successfully');
            console.log('SMS sent successfully');
          },
        );
      } catch (error) {
        console.log(error);
      }
    }
    setSaveInitate(false);
  };
  const permissions = async () => {};
  useEffect(() => {
    if (saveInitate) {
      alertPeaples();
    }
  }, [saveInitate]);

  const handlePress = () => {
    controller.close();
  };
  useEffect(() => {
    if (contact.length) {
      handleChange();
    }
  }, [contact]);
  const handleChange = async (items) => {
    console.log('items', items);
    if (!items) return;
    let _allContacts = [...allContacts];
    let payload = {
      label: null,
      value: null,
      senderID: id,
    };
    let index = _allContacts.findIndex(
      (x) => x.value === items[items.length - 1],
    );
    payload.value = _allContacts[index].value;
    payload.label = _allContacts[index].label;

    await axios.post(`${URL}/bsafe/create`, payload).catch((err) => {
      console.log(err);
    });
    loadExisting();
  };
  const removeNumber = async (_i) => {
    console.log(_i);
    let _selectedContacts = [...selectedContacts];
    console.log(_selectedContacts[_i]);
    await axios.post(`${URL}/bsafe/remove`, {id: _selectedContacts[_i].id});
    loadExisting();
  };
  const loadExisting = async () => {
    let unique = await DeviceInfo.getUniqueId();
    setId(unique);
    let response = await axios
      .get(`${URL}/bsafe/all?senderID=${unique}`)
      .catch((err) => {
        console.log(err.ressponse);
      });
    if (response && response.data && response.data.data) {
      console.log('data', response.data.data);
      let _selectedContacts = [];
      for (const item of response.data.data) {
        _selectedContacts.push(item);
      }
      console.log('selected contacts formatted', _selectedContacts);
      let _contacts = _selectedContacts.map((con) => con.value);
      setSelectedContacts(_selectedContacts);
      setContact(_contacts);

      // for (const iterator of _selectedContacts) {
      //   await axios.post(`${URL}/bsafe/remove`, {id: iterator.id});
      // }
    }
  };
  useEffect(() => {
    permissions();
    loadExisting();
  }, []);
  return (
    <>
      <NavBar
        title="bSafe"
        titleStyle={styles.title}
        style={styles.navBar}
        left={<Image style={styles.tinyLogo} source={Logo}></Image>}
      />
      <ScrollView style={styles.scrollView}>
        <AnimatedLoader
          visible={loading}
          overlayColor="rgba(255,255,255,0.75)"
          source={require('./loader.json')}
          animationStyle={styles.lottie}
          speed={1}>
          <Text>Doing something...</Text>
        </AnimatedLoader>
        {contact.length && !loading ? (
          <View style={styles.card}>
            <ContactList
              contacts={selectedContacts}
              removeNumber={removeNumber}
            />
          </View>
        ) : (
          <React.Fragment />
        )}
        {!loading ? (
          <React.Fragment>
            <View style={{...styles.container, height: open ? 400 : 150}}>
              <DropDownPicker
                searchable={true}
                searchablePlaceholder="Search for an item"
                searchablePlaceholderTextColor="gray"
                placeholder="Select an item"
                items={allContacts}
                defaultValue={contact}
                dropDownMaxHeight={350}
                multiple={true}
                multipleText="%d items have been selected."
                containerStyle={{height: 40}}
                style={{backgroundColor: '#fafafa'}}
                itemStyle={{
                  justifyContent: 'flex-start',
                }}
                max={5}
                dropDownStyle={{backgroundColor: '#fafafa', height: 300}}
                onChangeItem={(item, index) => {
                  setContact(item);
                  handleChange(item);
                }}
                onOpen={() => {
                  setOpen(true);
                }}
                onClose={() => {
                  setOpen(false);
                }}
                controller={(instance) => (controller = instance)}
              />
            </View>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Button
                color="info"
                onPress={() => {
                  handlePress();
                }}
                style={{backgroundColor: '#F38801'}}>
                OK
              </Button>
            </View>
          </React.Fragment>
        ) : (
          <React.Fragment />
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  navBar: {
    backgroundColor: '#F38801',
  },
  title: {
    color: '#FFF',
    fontSize: 50,
    fontWeight: 'bold',
  },
  inputContainer: {
    padding: 10,
    // backgroundColor: Colors.dark,
  },
  container: {
    flex: 1,
    paddingTop: 40,

    // alignItems: 'center',
    elevation: 2,
    padding: 10,
    backgroundColor: '#D97303',
    margin: 10,
    borderRadius: 20,
  },

  card: {
    elevation: 2,
    padding: 10,
    backgroundColor: '#D97303',
    margin: 10,
    borderRadius: 20,
  },
  tinyLogo: {
    width: 50,
    height: 50,
  },
});

export default App;
