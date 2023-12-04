import React from 'react';
import mergeWith from 'lodash/mergeWith';
import cloneDeep from 'lodash/cloneDeep';
import cx from 'classnames';
import {FormItem, Icon, Select} from 'amis';
import {Input, PickerContainer, Spinner} from 'amis-ui';

import {getEnv} from 'mobx-state-tree';
import {normalizeApi, isEffectiveApi, isApiOutdated} from 'amis-core';

import {
  isObject,
  autobind,
  createObject,
  tipedLabel,
  anyChanged,
  getSchemaTpl
} from 'amis-editor-core';

import type {SchemaObject, SchemaCollection, SchemaApi} from 'amis';
import type {Api} from 'amis';
import type {FormControlProps} from 'amis-core';
import type {ActionSchema} from 'amis';
import debounce from 'lodash/debounce';

export type ApiObject = Api & {
  messages?: Record<
    | 'fetchSuccess'
    | 'fetchFailed'
    | 'saveOrderSuccess'
    | 'saveOrderFailed'
    | 'quickSaveSuccess'
    | 'quickSaveFailed',
    string
  >;
};

export interface DataSourceControlProps extends FormControlProps {
  name?: string;
  label?: string;
  value?: any;

  /**
   * 开启debug模式
   */
  debug?: boolean;

  /**
   * 接口消息设置描述信息
   */
  messageDesc?: string;

  /**
   * 顶部按钮集合
   */
  actions?: Array<ActionSchema>;

  /**
   * 底部集合
   */
  footer?: Array<SchemaObject>;

  /**
   * 是否开启选择模式，开启后actions属性失效
   */
  enablePickerMode?: boolean;

  /**
   * 触发Picker的按钮配置
   */
  pickerBtnSchema?: ActionSchema;

  /**
   * picker标题
   */
  pickerTitle?: string;

  /**
   * Picker绑定的Name
   */
  pickerName?: string;

  /**
   * picker模式的Schema
   */
  pickerSchema?: SchemaCollection;

  /**
   * Picker数据源
   */
  pickerSource?: SchemaApi;

  /**
   * Picker弹窗大小
   */
  pickerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * Picker顶部的CSS类名
   */
  pickerHeaderClassName?: string;

  /**
   * 是否只返回内部TabsPanel
   */
  onlyTabs?: boolean;

  /**
   * 开启高亮显示
   */
  enableHighlight?: boolean;

  /**
   * Picker选项的label字段
   */
  labelField?: string;

  /**
   * 检索字段
   */
  searchField?: string;

  /**
   * 检索字段类型
   */
  searchType?: string;

  /**
   * 底部区域CSS类名
   */
  footerClassName?: string;

  /**
   * Picker面板确认
   */
  onPickerConfirm: (values: any) => void | any;

  /**
   * Picker面板关闭
   */
  onPickerClose: () => void;

  onChangeSelect: (val: any) => void;
  /**
   * Picker面板选择
   */
  onPickerSelect: (values: any) => void | any;

  onAction: (
    schema: ActionSchema,
    e: React.MouseEvent<any> | void | null,
    action: object,
    data: any
  ) => void;
}

export interface DataSourceControlState {
  apiStr: string;
  selectedItem?: any[];
  schema?: SchemaCollection;
  loading: boolean;
  options: any[];
  selectVal: any;
  api: any;
}

export default class DataSourceControl extends React.Component<
  DataSourceControlProps,
  DataSourceControlState
> {
  input?: HTMLInputElement;

  static defaultProps: Pick<
    DataSourceControlProps,
    'pickerBtnSchema' | 'labelField' | 'searchType'
  > = {
    pickerBtnSchema: {
      type: 'button',
      level: 'link',
      size: 'sm'
    },
    labelField: 'label',
    searchType: 'key'
  };

  constructor(props: DataSourceControlProps) {
    super(props);
    this.state = {
      apiStr: this.transformApi2Str(props.value),
      selectedItem: [],
      schema: props.pickerSchema,
      loading: false,
      options: [
        {
          label: '人员信息',
          value: 'user',
          listApi: {
            url: 'listApi',
            method: 'post',
            field: [
              {
                label: '姓名',
                name: 'name',
                inputType: 'input-text'
              },
              {
                label: '年龄',
                name: 'age',
                inputType: 'input-number'
              }
            ],
            insertApi: {
              url: 'insertApi',
              method: 'post'
            },
            editApi: {
              url: 'editApi',
              method: 'post'
            },
            bulkEditApi: {
              url: 'bulkEditApi',
              method: 'post'
            },
            deleteApi: {
              url: 'deleteApi',
              method: 'post'
            },
            bulkDeleteApi: {
              url: 'bulkDeleteApi',
              method: 'post'
            },
            viewApi: {
              url: 'viewApi',
              method: 'post'
            }
          }
        },
        {
          label: '部门信息',
          value: 'dept'
        }
      ],
      api: {},
      selectVal: props.value
    };
  }
  @autobind
  selectChange(val: any) {
    if (this.props.name === 'api') {
      this.setState({
        selectVal: val.value
      });
      this.props.onChange({
        url: val.value,
        method: val.method
      });
    } else {
      this.setState({
        selectVal: val.value
      });
      this.props.onChange(val.listApi);
    }
  }
  componentDidMount() {
    const {name, data} = this.props;
    const {selectVal, options} = this.state;
    if (name === 'api') {
      this.setState({
        selectVal: data.api.url
      });
    } else if (data && data.listApi) {
      if (name === 'listApi') {
        const findData = options.find(
          item => item.listApi.url === this.props.value.url
        );
        this.setState({
          selectVal: findData.value
        });
      } else {
        this.props.onChange(data.listApi[name as string]);
        this.setState({
          selectVal: data.listApi[name as string].url
        });
      }
    }
  }

  componentDidUpdate(prevProps: DataSourceControlProps) {
    const props = this.props;
    if (prevProps.value !== props.value) {
      this.setState({apiStr: this.transformApi2Str(props.value)});
      this.updatePickerOptions();
    }
    if (anyChanged(['enablePickerMode', 'pickerSchema'], prevProps, props)) {
      this.setState({schema: props.pickerSchema});
    }

    if (
      isApiOutdated(
        prevProps?.pickerSource,
        props?.pickerSource,
        prevProps.data,
        props.data
      )
    ) {
      this.fetchOptions();
    }
  }

  /**
   * 已选API详情，因为list接口是分页的，所以需要单独调用一次
   */
  async updatePickerOptions() {
    const apiObj = normalizeApi(this.props.value);

    if (apiObj?.url?.startsWith('api://')) {
      this.setState({loading: true});
      const keyword = apiObj.url.replace('api://', '');

      try {
        await this.fetchOptions(keyword);
      } catch (error) {}
    }
    this.setState({loading: false});
  }

  transformApi2Str(value: any) {
    const api = normalizeApi(value);

    return api.url
      ? `${
          api.method &&
          api.method.toLowerCase() !==
            'get' /** 默认为GET请求，直接隐藏掉前缀，为了呈现更多信息 */
            ? `${api.method}:`
            : ''
        }${api.url}`
      : '';
  }

  async fetchOptions(keyword?: string) {
    const {value, data, env, searchField, searchType} = this.props;
    let {pickerSource} = this.props;
    const apiObj = normalizeApi(value);

    if (!pickerSource || !apiObj?.url) {
      return;
    }

    const apiKey = apiObj?.url?.split('api://')?.[1];
    const ctx = createObject(data, {
      value,
      op: 'loadOptions',
      ...(keyword && searchField ? {[searchField]: keyword, searchType} : {})
    });
    const schemaFilter = getEnv((window as any).editorStore).schemaFilter;

    // 基于爱速搭的规则转换一下
    if (schemaFilter) {
      pickerSource = schemaFilter({api: pickerSource}).api;
    }

    if (isEffectiveApi(pickerSource, ctx)) {
      const res = await env.fetcher(pickerSource, ctx);
      const items: any[] = res.data?.items || res?.data?.rows;

      if (items.length) {
        const selectedItem = items.find(item => item.key === apiKey);

        this.setState({selectedItem: selectedItem ? [selectedItem] : []});
      }
    }
  }

  @autobind
  inputRef(ref: any) {
    this.input = ref;
  }

  focus() {
    if (!this.input) {
      return;
    }

    this.input.focus();
  }

  @autobind
  clearPickerValue() {
    const {onChange} = this.props;

    this.setState(
      {apiStr: this.transformApi2Str(undefined), selectedItem: []},
      () => {
        onChange?.(undefined);
        this.focus();
      }
    );
  }

  handleSimpleInputChange = debounce((value: string) => {
    this.handleSubmit(value, 'input');
  }, 1000);

  @autobind
  handleSubmit(values: SchemaApi, action?: 'input' | 'picker-submit') {
    const {onChange, value} = this.props;
    let api: Api = values;

    // Picker未做选择
    if (!values && action === 'picker-submit') {
      return;
    }

    if (typeof value !== 'string' || typeof values !== 'string') {
      api = mergeWith(
        {},
        normalizeApi(value),
        normalizeApi(values),
        (value, srcValue, key) => {
          // 这三个支持删除单个key的属性需用新值完全替换
          // 否则删除无效
          if (['data', 'responseData', 'headers'].includes(key)) {
            return srcValue;
          }
        }
      );
      ['data', 'responseData', 'headers'].forEach((item: keyof Api) => {
        if (api[item] == null) {
          delete api[item];
        }
      });
    }
    onChange?.(api);
  }

  handleAction(
    schema: ActionSchema,
    e: React.MouseEvent<any> | void | null,
    action: object,
    data: any
  ) {
    const {onAction} = this.props;

    onAction?.(schema, e, action, data);
  }

  normalizeValue(value: any, callback: (value: any) => any) {
    let transformedValue = cloneDeep(value);

    if (typeof callback === 'function') {
      transformedValue = callback(value);
    }

    return transformedValue;
  }

  @autobind
  handlePickerConfirm(value: any) {
    const {onPickerConfirm} = this.props;

    this.handleSubmit(
      this.normalizeValue(value, onPickerConfirm),
      'picker-submit'
    );
  }

  render() {
    const {
      render,
      className,
      footerClassName,
      classPrefix,
      label,
      labelRemark,
      value,
      footer,
      border = false,
      onlyTabs = false,
      messageDesc,
      enablePickerMode,
      disabled,
      mode,
      enableHighlight,
      labelField = 'label',
      useMobileUI,
      popOverContainer,
      env,
      renderLabel,
      interfaceList,
      name
    } = this.props;
    let {apiStr, selectedItem, loading} = this.state;
    selectedItem =
      Array.isArray(selectedItem) && selectedItem.length !== 0
        ? selectedItem
        : [];
    return (
      <>
        <Select
          className="w-full"
          options={name !== 'listApi' ? interfaceList : this.state.options}
          value={this.state.selectVal}
          onChange={this.selectChange}
        ></Select>
      </>
    );
  }
}

@FormItem({
  type: 'ae-dataSourceControl',
  renderLabel: false
})
export class DataSourceControlRenderer extends DataSourceControl {}
