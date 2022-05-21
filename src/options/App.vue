<template >

<div class="" v-bind:class="{ darkmode: darkMode }">

  <div class="container" >
    <div id="row">
    <div id="col">
 <b-icon icon="sun" variant="warning" aria-hidden="true"></b-icon>
         <label for="darkMode">
            <b-form-checkbox 
              v-model="darkMode"
              id="darkMode"
              @change.native="darkModeSwitch()"
              switch
            >
            <b-icon icon="moon"  variant="primary" aria-hidden="true"></b-icon>
            </b-form-checkbox>
        </label>

      <h1 class="text-primary">
      {{ $t('appName').message }}
      </h1>
    </div>
    </div>
    <br />
    <div class="row" >
      
      <div class="col">
        <div>
          <h3 class="text-dark"> {{ $t('subOptionTitle'.message) }} </h3>
        </div>
        <div class="row">
          <div class="col">
            <p class="text-danger" v-if="msg">{{ msg }}</p>
            <b-input-group>
              <b-input-group-prepend>
                <b-input-group-text class ="" v-bind:class="{ 'bg-dark text-dark': darkMode }">
                  {{ $t('formTitle').message }}</b-input-group-text>
              </b-input-group-prepend>

              <b-form-input class ="" v-bind:class="{ 'bg-dark text-dark' : darkMode }" v-model="match"></b-form-input>

              <b-input-group-append>
                <b-form-select class ="" v-bind:class="{ 'bg-dark text-dark' : darkMode }"
                  
                  v-model="position"
                  :options="positions"
                ></b-form-select>
                <b-form-select class ="" v-bind:class="{ 'bg-dark text-dark' : darkMode }"
                  v-model="closing_position"
                  :options="closing_positions"
                ></b-form-select>
                <b-form-select class ="" v-bind:class="{ 'bg-dark text-dark' : darkMode }"
                  v-model="for_back_position"
                  :options="for_back_positions"
                ></b-form-select>
              </b-input-group-append>
              <b-input-group-append>
                <b-button  :variant="dark_mode_radio"   @click="addToList()"
                  >{{ $t('button_add').message }}</b-button
                >
              </b-input-group-append>
            </b-input-group>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <br />
            <div class="section-header first">
              <h6 class="text-dark">{{ $t('open').message }}  {{selectedOpen}}</h6>
            </div>
                <b-form-group>
                  <b-form-radio-group  class="text-dark"
                    buttons
                    :button-variant="'outline-'+darkModevariant"
                    v-model="selectedOpen"
                    :options="optionsOpen"
                    @change.native="saveTolocalstorage('tabOpeningPosition',selectedOpen)"
                    name="openRadio"
                    
                  ></b-form-radio-group>
                </b-form-group>
          </div>
        </div>
        <div class="row">
          <div class="col">
            
            <div class="section-header">
              <h6 class="text-dark">{{ $t('close').message }}</h6>
            </div>
                <b-form-group>
                  <b-form-radio-group class="text-dark"
                    buttons
                    :button-variant="'outline-'+darkModevariant"
                    v-model="selectedClose"
                    :options="optionsClose"
                    @change.native="saveTolocalstorage('tabClosingBehavior',selectedClose)"
                    name="closeRadio"
                  ></b-form-radio-group>
                </b-form-group>
          </div>
        </div>
        <div class="row">
          <div class="col">
           
            <div class="section-header">
              <h6 class="text-dark">{{ $t('new').message }}</h6>
            </div>

                <b-form-group>
                  <b-form-radio-group class="text-dark"
                    buttons
                    :button-variant="'outline-'+darkModevariant"
                    v-model="selectedNew"
                    :options="optionsNew"
                    @change.native="saveTolocalstorage('newCreatedTab',selectedNew)"
                    name="newRadio"
                  ></b-form-radio-group>
                </b-form-group>

          </div>
        </div>
          <div class="row">
          <div class="col">
           
            <div class="section-header">
              <h6 class="text-dark">{{ $t('menuButton').message }}</h6>
            </div>

                <b-form-group>
                  <b-form-radio-group class="text-dark"
                    buttons
                    :button-variant="'outline-'+darkModevariant"
                    v-model="selectButton"
                    :options="optionsButton"
                    @change.native="saveTolocalstorage('button_last_tab',selectButton)"
                    name="buttonRadio"
                  ></b-form-radio-group>
                  <p>*Will take effect after a reload of the extension </p>
                </b-form-group>

          </div>
        </div>
        <div class="row" hidden>
          <div class="col">
            
            <div class="section-header">
              <h6 class="text-dark">{{ $t('misc').message }}</h6>
              <p class="text-warning"> {{ $t('disabled').message }} </p>
            </div>

            <form name="same_window">
              <div>
                <input type="checkbox" name="true"  disabled/><span
                disabled>{{ $t('miscSameWindow').message }}</span>
                <div class="exception-list">
                  <span id="miscSameWindowExceptionText">{{ $t('miscSameWindowException').message }}</span><br />
                  <textarea
                    name="exception"
                    cols="50"
                    rows="5"
                    wrap="hard"
                  disabled></textarea>
                  <input type="reset" name="reset" />
                </div>
              </div>
            </form>
            <form name="external_link_default">
              <div>
                <input type="checkbox" name="true"  disabled/><span
                  >
                  {{ $t('miscExternalLinkDefault').message }}
                </span>
              </div>
            </form>
            <form name="external_link_unfocus">
              <div>
                <input type="checkbox" name="true" disabled/><span
                  >
                {{ $t('miscExternalLinkUnfocus').message }} </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="col">
        <div>
          <span class="text-dark" id="subOptionTitle2Text" />
                    <small
                    ><b-button
                      v-b-tooltip.hover title="Show/hide"
                      size="sm"
                      :variant="'outline-' + darkModevariant"
                      class="mb-2"
                      @click="expandList"
                    >
                      <b-icon icon="chevron-bar-expand" aria-hidden="true"></b-icon>
                      <span class="sr-only">Show/hide</span>
                    </b-button></small>
          

        </div>
        <div class="row">
          <div class="col wrapper-container">
            <b-list-group class="">
              <b-list-group-item
                v-for="(item, index) in list"
                v-bind:key="item + 'list ' + index"
                v-bind:index="index"
                
                :variant="darkModevariant"
                href="#"
                class="d-flex flex-column align-items-start"
              >
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1">
                    <span>
                  <b-avatar 
                    size="1em" 
                    square 
                    v-bind:src="'https://s2.googleusercontent.com/s2/favicons?domain_url='+item.name"
                    
                    v-b-tooltip.hover v-bind:title="item.name"
                  ></b-avatar>
                      <b-badge :variant="darkModevariant" v-b-tooltip.hover v-bind:title="$t('tooltip').open" square>
                        {{ getLocalization( 'open', item.value) }}</b-badge
                      >
                      <b-badge :variant="darkModevariant" v-b-tooltip.hover v-bind:title="$t('tooltip').close" square>
                        {{ getLocalization( 'close', item.closing) }}</b-badge
                      >
                    </span>
                  </h5>
                  <small
                    ><b-button
                      v-b-tooltip.hover title="Delete"
                      size="sm"
                      variant="outline-danger"
                      class="mb-2"
                      @click="removeFromList(index)"
                    >
                      <b-icon icon="trash" aria-hidden="true"></b-icon>
                      <span class="sr-only">{{$t('delete_button').message}}</span>
                    </b-button></small>
                </div>
                <div v-if="expand_text_list">
                <span v-if="item.name.length < 40">
                  {{ item.name }} </span>
                <span v-else >
                  {{ item.name.substring(0, 40) + ".." }} </span>
                </div>
              </b-list-group-item>
            </b-list-group>
          </div>
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
        selectedNew: localStorage['newCreatedTab'],
        optionsNew: [
          { 
           text: this.$t('new').background.message,
           value: this.$t('new').background.value,
           },
          { 
           text: this.$t('new').default.message,
           value: this.$t('new').default.value,
           },
          { 
           text: this.$t('new').foreground.message,
           value: this.$t('new').foreground.value,
           }

        ],
        selectedNew: localStorage['button_last_tab'],
        optionsButton: [
          { 
           text:"Yes",
           value: true,
           },
                     { 
           text:"No",
           value: false,
           },
 

        ],
        selectedOpen: localStorage['tabOpeningPosition'],
        optionsOpen: [
          { 
           text: this.$t('open').first.message,
           value: this.$t('open').first.value,
           },
          { 
           text: this.$t('open').default.message,
           value: this.$t('open').default.value,
           },
          { 
           text: this.$t('open').last.message,
           value: this.$t('open').last.value,
           },
          { 
           text: this.$t('open').left.message,
           value: this.$t('open').left.value,
           },
          { 
           text: this.$t('open').right.message,
           value: this.$t('open').right.value,
           }
        ],
        selectedClose: localStorage['tabClosingBehavior'],
        optionsClose: [
          { 
           text: this.$t('match_option').first.message,
           value: this.$t('match_option').first.value,
           },
          { 
           text: this.$t('match_option').default.message,
           value: this.$t('match_option').default.value,
           },
          { 
           text: this.$t('match_option').last.message,
           value: this.$t('match_option').last.value,
           },
          { 
           text: this.$t('match_option').left.message,
           value: this.$t('match_option').left.value,
           },
          { 
           text: this.$t('match_option').right.message,
           value: this.$t('match_option').right.value,
           },
          { 
           text: this.$t('match_option').order.message,
           value: this.$t('match_option').order.value,
           }
        ],
      msg: "",
      position: null,
      closing_position: null, 
      for_back_position: null, 
      expand_text_list: false,
      darkMode: false,
      positions: [
        {
          text: this.$t('match_option').opening.message,
          value: null
        },
        {
          text: this.$t('match_option').first.message,
          value: this.$t('match_option').first.value
        },
        {
          text: this.$t('match_option').last.message,
          value: this.$t('match_option').last.value
        },
        {
          text: this.$t('match_option').right.message,
          value: this.$t('match_option').right.value
        },
        {
          text: this.$t('match_option').left.message,
          value: this.$t('match_option').left.value
        },
        {
          text: this.$t('match_option').default.message,
          value: this.$t('match_option').default.value
        }  
      ],
      closing_positions: [
        {
          text: this.$t('match_option').closing.message,
          value: null
        },
        {
          text: this.$t('match_option').first.message,
          value: this.$t('match_option').first.value
        },
        {
          text: this.$t('match_option').last.message,
          value: this.$t('match_option').last.value
        },
        {
          text: this.$t('match_option').right.message,
          value: this.$t('match_option').right.value
        },
        {
          text: this.$t('match_option').order.message,
          value: this.$t('match_option').order.value
        },
        {
          text: this.$t('match_option').left.message,
          value: this.$t('match_option').left.value
        },
        {
          text: this.$t('match_option').default.message,
          value: this.$t('match_option').default.value
        }  
      ],
for_back_positions: [
        {
          text: this.$t('fg_match_option').default.message,
          value: null
        },
        {
          text: this.$t('fg_match_option').forground.message,
          value: this.$t('fg_match_option').forground.value
        },
        {
          text: this.$t('fg_match_option').background.message,
          value: this.$t('fg_match_option').background.value
        },  
      ],
        button_last_tab: [
          {
          text: "Show context menu button",
          value: null
        },
        {
          text: "Yes",
          value: true
        },
        {
          text: "NO",
          value: false
        },
      ],
      match: "",
      list: [],
      darkModevariant:"dark",
      dark_mode_radio:"outline-secondary"
    };
  },
  created: function() {
    this.restore(this);
  },
  updated: function() {
    chrome.storage.sync.set({ list: this.list}, function() {});
    // this.init();
  },
  methods: {
    init: async function() {
      if(localStorage['tabOpeningPosition'] == null) this.selectedOpen = localStorage['tabOpeningPosition'] = 'default'; else this.selectedOpen = localStorage['tabOpeningPosition']
      if(localStorage['tabClosingBehavior'] == null) this.selectedClose = localStorage['tabClosingBehavior'] = 'default'; else this.selectedClose = localStorage['tabClosingBehavior']
      if(localStorage['newCreatedTab'] == null) this.selectedNew = localStorage['newCreatedTab'] = 'default'; else this.selectedNew = localStorage['newCreatedTab']
      if(localStorage['button_last_tab'] == null) this.selectButton = localStorage['button_last_tab'] = 'true'; else this.selectButton = localStorage['button_last_tab']
       

      var self = [];
      var mode;
      chrome.storage.sync.get("list", function(storageData) {
        this.list = storageData.list;
      });
    
      
   
      this.darkModeSwitch();
    },
    getLocalization( behavior , type){

        switch (type) {
          case "first":
            return this.$t(behavior).first.message;  
          case "last":
             return this.$t(behavior).last.message; 
          case "right":
             return this.$t(behavior).right.message; 
          case "left":
             return this.$t(behavior).left.message; 
          case "order":
             return this.$t(behavior).order.message;   
          case "default":
            return this.$t(behavior).default.message; 
        }
    },
    darkModeSwitch(){
      
      if(this.darkMode) {this.darkModevariant = 'secondary'; this.dark_mode_radio = "outline-light text-dark";} else {this.darkModevariant = 'dark'; this.dark_mode_radio = "outline-dark";}
      this.saveDarkMode();
    },
    saveDarkMode(){
      localStorage['darkMode'] = this.darkMode;
    },
    saveTolocalstorage(storage, input){
      localStorage[storage]  = input;
    },
    addToList() {
      if (this.match.length <= 0) {
        this.msg = this.$t('wrong_input_01').message;
      } else if (this.position == null) {
        this.msg = this.$t('wrong_input_02').message;
      } else if (this.closing_position == null) {
        this.msg = this.$t('wrong_input_03').message;
      } else {
        this.msg = this.$t('sucess').message;
        this.list.push({ name: this.match, value: this.position, closing:this.closing_position, openingType: this.for_back_position });
      }
    },
    removeFromList(index) {
      this.list.splice(index, 1);
    },
    expandList() {
      this.expand_text_list =! this.expand_text_list;
    },
    async restore(vm) {
      
      if(localStorage['tabOpeningPosition'] == null) this.selectedOpen = localStorage['tabOpeningPosition'] = 'default'; else this.selectedOpen = localStorage['tabOpeningPosition']
      if(localStorage['tabClosingBehavior'] == null) this.selectedClose = localStorage['tabClosingBehavior'] = 'default'; else this.selectedClose = localStorage['tabClosingBehavior']
      if(localStorage['newCreatedTab'] == null) this.selectedNew = localStorage['newCreatedTab'] = 'default'; else this.selectedNew = localStorage['newCreatedTab']
      if(localStorage['button_last_tab'] == null) this.selectButton = localStorage['button_last_tab'] = 'true'; else this.selectButton = localStorage['button_last_tab']
       
      if(localStorage['darkMode'] == 'true') this.darkMode = true; else this.darkMode = false;
      
      this.darkModeSwitch();
        
      

      chrome.storage.sync.get("list", function(storageData) {
        if (storageData.list != null) {
          vm.list = storageData.list;
        }
      });

    },
    getList() {
      chrome.storage.sync.get(["list"], function(items) {
        this.items = items;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
html,.body{
  height: 100%!important;
}
.container{
  min-height: 100%!important;
 
  height: 100vh!important;
  width:  100%!important;
  
}
.popupMain-container {
  padding-top: 2%;
  padding-right: 2%;
  padding-bottom: 2%;
  padding-left: 2%;

}
.container-fluid {
    padding-right:0!important;
    padding-left:0!important;
    margin-right:auto!important;
    margin-left:auto!important;
 }
.wrapper-container {
  max-height: 80vh!important;
  overflow-y: scroll;
}
.darkmode {
  min-height: 100%!important;
  
  height: 100%!important;
  width:  100%!important;

     border-bottom-left-radius: 0px !important;
     border-bottom-right-radius: 0px !important;
.text-dark{
  color:#C0C0C0	!important;
}
// .input-group{
//   color:white !important;
//     background-color: #000000 !important;
//     border-color: secondary !important;
//   outline-color: red;
//   border-inline-color: green;
// }

.text-primary{
  color:#C0C0C0	!important;
}
.text-secondary{
  color:white!important;
}

background: black!important;
}
</style>
