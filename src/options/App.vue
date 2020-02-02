<template>
  <div class="container" id="app">
    <div id="header">
      <h1><span class="text-primary" id="optionTitleText" /></h1>
    </div>
    <br />
    <div class="row">
      <div class="col">
        <div>
          <h3><span class="text-dark" id="subOptionTitleText" /></h3>
        </div>
        <div class="row">
          <div class="col">
            <p class="text-danger" v-if="msg">{{ msg }}</p>
            <b-input-group>
              <b-input-group-prepend>
                <b-input-group-text>Match</b-input-group-text>
              </b-input-group-prepend>

              <b-form-input v-model="match"></b-form-input>

              <b-input-group-append>
                <b-form-select
                  v-model="position"
                  :options="positions"
                ></b-form-select>
              </b-input-group-append>
              <b-input-group-append>
                <b-button variant="outline-secondary" @click="addToList()"
                  >Add</b-button
                >
              </b-input-group-append>
            </b-input-group>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <br />
            <div class="section-header first">
              <h6><span class="text-dark" id="openText" /></h6>
            </div>
            <form name="open">
              <div>
                <input type="radio" name="button" value="first" /><span
                  id="openFirstText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="last" /><span
                  id="openLastText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="right" /><span
                  id="openRightText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="left" /><span
                  id="openLeftText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="default" /><span
                  id="openDefaultText"
                />
              </div>
            </form>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <br />
            <div class="section-header">
              <h6><span class="text-dark" id="closeText" /></h6>
            </div>

            <form name="close">
              <div>
                <input type="radio" name="button" value="first" /><span
                  id="closeFirstText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="last" /><span
                  id="closeLastText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="right" /><span
                  id="closeRightText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="left" /><span
                  id="closeLeftText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="order" /><span
                  id="closeOrderText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="default" /><span
                  id="closeDefaultText"
                />
              </div>
            </form>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <br />
            <div class="section-header">
              <h6><span class="text-dark" id="newText" /></h6>
            </div>

            <form name="new_tab">
              <div>
                <input type="radio" name="button" value="foreground" /><span
                  id="newForegroundText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="background" /><span
                  id="newBackgroundText"
                />
              </div>
              <div>
                <input type="radio" name="button" value="default" /><span
                  id="newDefaultText"
                />
              </div>
            </form>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <br />
            <div class="section-header">
              <h6><span class="text-dark" id="miscText" /></h6>
            </div>

            <form name="same_window">
              <div>
                <input type="checkbox" name="true" /><span
                  id="miscSameWindowText"
                ></span>
                <div class="exception-list">
                  <span id="miscSameWindowExceptionText"></span><br />
                  <textarea
                    name="exception"
                    cols="50"
                    rows="5"
                    wrap="hard"
                  ></textarea>
                  <input type="reset" name="reset" />
                </div>
              </div>
            </form>
            <form name="external_link_default">
              <div>
                <input type="checkbox" name="true" /><span
                  id="miscExternalLinkDefaultText"
                />
              </div>
            </form>
            <form name="external_link_unfocus">
              <div>
                <input type="checkbox" name="true" /><span
                  id="miscExternalLinkUnfocusText"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="col">
        <div>
          <h3><span class="text-dark" id="subOptionTitle2Text" /></h3>
        </div>
        <div class="row">
          <div class="col wrapper-container">
            <b-list-group class="">
              <b-list-group-item
                v-for="(item, index) in list"
                v-bind:key="item + 'list ' + index"
                v-bind:index="index"
                variant="info"
                href="#"
                class="d-flex flex-column align-items-start"
              >
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1">
                    <span>
                      <b-badge variant="primary" pill>
                        {{ item.value }}</b-badge
                      >
                    </span>
                  </h5>
                  <small
                    ><b-button
                      size="sm"
                      variant="outline-danger"
                      class="mb-2"
                      @click="removeFromList(index)"
                    >
                      <b-icon icon="trash" aria-hidden="true"></b-icon>
                      <span class="sr-only">Delete</span>
                    </b-button></small
                  >
                </div>
                <span v-if="item.name.length < 60">{{ item.name }} </span>
                <span v-else>{{ item.name.substring(0, 60) + ".." }} </span>
              </b-list-group-item>
            </b-list-group>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      msg: "",
      position: null,
      positions: [
        {
          text: "Select",
          value: null
        },
        {
          text: "First",
          value: "first"
        },
        {
          text: "Last",
          value: "last"
        },
        {
          text: "Right",
          value: "right"
        },
        {
          text: "Left",
          value: "left"
        }
      ],
      match: "",
      list: []
    };
  },
  created: function() {
    this.restore(this);
  },
  updated: function() {
    chrome.storage.sync.set({ list: this.list }, function() {});

    // this.init();
  },
  methods: {
    init: async function() {
      var self = [];
      chrome.storage.sync.get("list", function(storageData) {
        self = storageData.list;
      });
      this.list = self;
    },
    addToList() {
      if (this.match.length <= 0) {
        this.msg = "Missing input in Match";
      } else if (this.position == null) {
        this.msg = "Nothing selected";
      } else {
        this.msg = "";
        this.list.push({ name: this.match, value: this.position });
      }
    },
    removeFromList(index) {
      this.list.splice(index, 1);
    },
    async restore(vm) {
      chrome.storage.sync.get("list", function(storageData) {
        if (storageData.list != null) {
          vm.list = storageData.list;
        }
      });
    },
    getList() {
      alert("Inside");
      chrome.storage.sync.get(["list"], function(items) {
        alert("GET A" + items);

        this.items = items;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.popupMain-container {
  padding-top: 2%;
  padding-right: 2%;
  padding-bottom: 2%;
  padding-left: 2%;
}
.wrapper-container {
  max-height: 800px;
  overflow-y: scroll;
}
</style>
