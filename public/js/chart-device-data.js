/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.CO2Data = new Array(this.maxLen);
      this.COData = new Array(this.maxLen);
      this.NO2Data = new Array(this.maxLen);
      this.O3Data = new Array(this.maxLen);
      this.PM25Data = new Array(this.maxLen);
      this.PM10Data = new Array(this.maxLen);
      this.VOCData = new Array(this.maxLen);
    }

    addData(time, CO2, CO, NO2, O3, PM25, PM10, VOC) {
      this.timeData.push(time);
      this.CO2Data.push(CO2);
      this.COData.push(CO);
      this.NO2Data.push(NO2);
      this.O3Data.push(O3);
      this.PM25Data.push(PM25);
      this.PM10Data.push(PM10);
      this.VOCData.push(VOC);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.CO2Data.shift();
        this.COData.shift();
        this.NO2Data.shift();
        this.O3Data.shift();
        this.PM25Data.shift();
        this.PM10Data.shift();
        this.VOCData.shift();
      }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'CO2 (ppb)',
        yAxisID: 'CO2',
        borderColor: 'rgba(255, 243, 163, 1)',
        pointBoarderColor: 'rgba(255, 243, 163, 1)',
        backgroundColor: 'rgba(255, 243, 163, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 243, 163, 1)',
        pointHoverBorderColor: 'rgba(255, 243, 163, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'CO (ppb)',
        yAxisID: 'CO',
        borderColor: 'rgba(240, 140, 255, 1)',
        pointBoarderColor: 'rgba(240, 140, 255, 1)',
        backgroundColor: 'rgba(240, 140, 255, 0.4)',
        pointHoverBackgroundColor: 'rgba(240, 140, 255, 1)',
        pointHoverBorderColor: 'rgba(240, 140, 255, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'NO2 (ppb)',
        yAxisID: 'NO2',
        borderColor: 'rgba(255, 163, 191, 1)',
        pointBoarderColor: 'rgba(255, 163, 191, 1)',
        backgroundColor: 'rgba(255, 163, 191, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 163, 191, 1)',
        pointHoverBorderColor: 'rgba(255, 163, 191, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'O3 (ppb)',
        yAxisID: 'O3',
        borderColor: 'rgba(255, 220, 163, 1)',
        pointBoarderColor: 'rgba(255, 220, 163, 1)',
        backgroundColor: 'rgba(255, 220, 163, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 220, 163, 1)',
        pointHoverBorderColor: 'rgba(255, 220, 163, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'PM2.5 (μg/m³)',
        yAxisID: 'PM2.5',
        borderColor: 'rgba(163, 223, 255, 1)',
        pointBoarderColor: 'rgba(163, 223, 255, 1)',
        backgroundColor: 'rgba(163, 223, 255, 0.4)',
        pointHoverBackgroundColor: 'rgba(163, 223, 255, 1)',
        pointHoverBorderColor: 'rgba(163, 223, 255, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'PM10 (μg/m³)',
        yAxisID: 'PM10',
        borderColor: 'rgba(184, 255, 163, 1)',
        pointBoarderColor: 'rgba(184, 255, 163, 1)',
        backgroundColor: 'rgba(184, 255, 163, 0.4)',
        pointHoverBackgroundColor: 'rgba(184, 255, 163, 1)',
        pointHoverBorderColor: 'rgba(184, 255, 163, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'VOC (ppb)',
        yAxisID: 'VOC',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'ppb',
        type: 'linear',
        scaleLabel: {
          labelString: 'CO2, CO, NO2, O3, VOC (ppb)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'μg/m3',
        type: 'linear',
        scaleLabel: {
          labelString: 'PM2.5, PM10 (μg/m³)',
          display: true,
        },
        position: 'right',
      }]
    }
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.CO2Data;
    chartData.datasets[1].data = device.COData;
    chartData.datasets[2].data = device.NO2Data;
    chartData.datasets[3].data = device.O3Data;
    chartData.datasets[4].data = device.PM25Data;
    chartData.datasets[5].data = device.PM10Data;
    chartData.datasets[6].data = device.VOCData;
    myLineChart.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      // time and either temperature or humidity are required
      if (!messageData.MessageDate || (!messageData.IotData.CO2 && !messageData.IotData.CO && !messageData.IotData.NO2 && !messageData.IotData.O3 && !messageData.IotData.PM25 && !messageData.IotData.PM10 && !messageData.IotData.VOC)) {
        return;
      }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.CO2, messageData.IotData.CO, messageData.IotData.NO2, messageData.IotData.O3, messageData.IotData.PM25, messageData.IotData.PM10, messageData.IotData.VOC);
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.CO2, messageData.IotData.CO, messageData.IotData.NO2, messageData.IotData.O3, messageData.IotData.PM25, messageData.IotData.PM10, messageData.IotData.VOC);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});
