// Change this address to match your deployed contract!
const contract_address = "0x7333F84C2CF27794a06922c6F82c9C5a831b32b9";

const dApp = {
  ethEnabled: function() {
    // If the browser has MetaMask installed
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      window.ethereum.enable();
      return true;
    }
    return false;
  },
  updateUI: function() {
    const renderItem = (token_id, report_uri, icon_class, {name, description, image}) => `
        <li>
          <div class="collapsible-header"><i class="${icon_class}"></i>Copyright Number ${token_id}: ${name}</div>
          <div class="collapsible-body">
            <h6>Description</h6>
            <p>${description}</p>
            <img src="https://gateway.pinata.cloud/ipfs/${image.replace("ipfs://", "")}" style="width: 100%" />
            <p><a href="${report_uri}">Report Results URI</a></p>
          </div>
        </li>
    `;

    // fetch json metadata from IPFS (name, description, image, etc)
    const fetchMetadata = (report_uri) => fetch(`https://gateway.pinata.cloud/ipfs/${report_uri.replace("ipfs://", "")}`, { mode: "cors" }).then((resp) => resp.json());

    // fetch the Copyright Events from the contract and append them to the UI list
    this.contract.events.Copyright({fromBlock: 0}, (err, event) => {
      const { token_id, report_uri } = event.returnValues;

      fetchMetadata(report_uri)
      .then((json) => {
        $("#dapp-token").append(renderItem(token_id, report_uri, "far fa-token", json));
      });
    });

    // fetch the OpenSource Events from the contract and append them to the UI list
    this.contract.events.OpenSource({fromBlock: 0}, (err, event) => {
      const { token_id, report_uri } = event.returnValues;

      fetchMetadata(report_uri)
      .then((json) => {
        $("#dapp-opensource").append(renderItem(token_id, report_uri, "fab fa-osi", json));
      });
    });
  },
  copyrightWork: async function() {
    const name = $("#dapp-token-name").val();
    const description = $("#dapp-token-description").val();
    const image = document.querySelector('input[type="file"]');

    const pinata_api_key = $("#dapp-pinata-api-key").val();
    const pinata_secret_api_key = $("#dapp-pinata-secret-api-key").val();

    if (!pinata_api_key || !pinata_secret_api_key || !name || !description || !image) {
      M.toast({ html: "Please fill out then entire form!" });
      return;
    }

    const image_data = new FormData();
    image_data.append("file", image.files[0]);
    image_data.append("pinataOptions", JSON.stringify({cidVersion: 1}));

    try {
      M.toast({ html: "Uploading Image to IPFS via Pinata..." });
      const image_upload_response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        mode: "cors",
        headers: {
          pinata_api_key,
          pinata_secret_api_key
        },
        body: image_data,
      });

      const image_hash = await image_upload_response.json();
      const image_uri = `ipfs://${image_hash.IpfsHash}`;

      M.toast({ html: `Success. Image located at ${image_uri}.` });
      M.toast({ html: "Uploading JSON..." });

      const report_json = JSON.stringify({
        pinataContent: { name, description, image: image_uri },
        pinataOptions: {cidVersion: 1}
      });

      const json_upload_response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key,
          pinata_secret_api_key
        },
        body: report_json
      });

      const report_hash = await json_upload_response.json();
      const report_uri = `ipfs://${report_hash.IpfsHash}`;

      M.toast({ html: `Success. report URI located at ${report_uri}.` });
      M.toast({ html: "Sending to blockchain..." });

      if ($("#dapp-opensource-toggle").prop("checked")) {
        this.contract.methods.openSourceWork(report_uri).send({from: this.accounts[0]})
        .on("receipt", (receipt) => {
          M.toast({ html: "Transaction Mined! Refreshing UI..." });
          location.reload();
        });
      } else {
        this.contract.methods.tokenWork(report_uri).send({from: this.accounts[0]})
        .on("receipt", (receipt) => {
          M.toast({ html: "Transaction Mined! Refreshing UI..." });
          location.reload();
        });
      }

    } catch (e) {
      alert("ERROR:", JSON.stringify(e));
    }
  },
  main: async function() {
    // Initialize web3
    if (!this.ethEnabled()) {
      alert("Please install MetaMask to use this dApp!");
    }

    this.accounts = await window.web3.eth.getAccounts();

    this.COVIDTestResultsABI = await (await fetch("./team5project.json")).json();

    this.contract = new window.web3.eth.Contract(
      this.COVIDTestResultsABI,
      contract_address,
      { defaultAccount: this.accounts[0] }
    );
    console.log("Contract object", this.contract);

    this.updateUI();
  }
};

dApp.main();
