/**
 * @file 表达式输入框组件
 */

import React from 'react';
import {autobind, FormControlProps} from 'amis-core';
import cx from 'classnames';
import {
  FormItem,
  Button,
  Icon,
  PickerContainer,
  Select,
  Modal,
  FormField,
  InputBox
} from 'amis';
import {FormulaEditor} from 'amis-ui';
import type {VariableItem} from 'amis-ui';
import {renderFormulaValue} from './FormulaControl';
import {reaction} from 'mobx';
import {getVariables} from 'amis-editor-core';

interface PermissionControlProps extends FormControlProps {
  /**
   * 用于提示的变量集合，默认为空
   */
  variables?: Array<VariableItem> | Function;

  /**
   * 配合 variables 使用
   * 当 props.variables 存在时， 是否再从 amis数据域中取变量集合，默认 false
   */
  requiredDataPropsVariables?: boolean;

  /**
   * 变量展现模式，可选值：'tabs' ｜ 'tree'
   */
  variableMode?: 'tabs' | 'tree';
  /**
   * 表达式最外层是否使用 ${} 来包裹，默认 true
   */
  evalMode: boolean;
}

interface ExpressionFormulaControlState {
  variables: Array<VariableItem>;

  formulaPickerValue: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  selectValue: string;
  modalFlag: boolean;
  addForm: {
    value?: string;
    label?: string;
  };
}

export default class PermissionControl extends React.Component<
  PermissionControlProps,
  ExpressionFormulaControlState
> {
  static defaultProps: Partial<PermissionControlProps> = {
    variableMode: 'tree',
    requiredDataPropsVariables: false,
    evalMode: true
  };

  isUnmount: boolean;
  unReaction: any;
  appLocale: string;
  appCorpusData: any;

  constructor(props: PermissionControlProps) {
    super(props);
    this.state = {
      modalFlag: false,
      variables: [],
      formulaPickerValue: '',
      addForm: {},
      options: [
        {
          label: '文本',
          value: 'text'
        },
        {
          label: '按钮',
          value: 'button'
        }
      ],
      selectValue: ''
    };
  }
  @autobind
  selectChange(e: any) {
    console.log(1111);
    // this.props?.onChange?.(`\${permission.${e.value}}`);
    this.props?.onChange?.(e.value || '');
  }

  onAdd = (e: any) => {
    this.setState({
      modalFlag: true
    });
    console.log(111222, e);
  };
  confirm = () => {
    this.state.options.push(this.state.addForm);
    this.setState({
      options: this.state.options,
      modalFlag: false
    });
  };
  async componentDidMount() {
    this.initFormulaPickerValue(this.props.value);
    // const editorStore = (window as any).editorStore;
    // this.appLocale = editorStore?.appLocale;
    // this.appCorpusData = editorStore?.appCorpusData;

    // this.unReaction = reaction(
    //   () => editorStore?.appLocaleState,
    //   async () => {
    //     this.appLocale = editorStore?.appLocale;
    //     this.appCorpusData = editorStore?.appCorpusData;
    //   }
    // );
  }

  async componentDidUpdate(prevProps: PermissionControlProps) {
    if (prevProps.value !== this.props.value) {
      this.initFormulaPickerValue(this.props.value);
    }
  }

  componentWillUnmount() {
    this.isUnmount = true;
    this.unReaction?.();
  }

  @autobind
  initFormulaPickerValue(value: string) {
    let formulaPickerValue =
      value?.replace(
        /^\$\{permission.(.*)\}$/,
        (match: string, p1: string) => p1
      ) || '';
    this.setState({
      formulaPickerValue
    });
  }

  // @autobind
  // handleConfirm(value = '') {
  //   const expressionReg = /^\$\{(.*)\}$/;
  //   value = value.replace(/\r\n|\r|\n/g, ' ');
  //   if (value && !expressionReg.test(value)) {
  //     value = `\${${value}}`;
  //   }
  //   this.props?.onChange?.(value);
  // }

  // @autobind
  // handleClearExpression(e: React.MouseEvent<HTMLElement>) {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   this.props?.onChange?.('');
  // }

  // @autobind
  // async handleOnClick(
  //   e: React.MouseEvent,
  //   onClick: (e: React.MouseEvent) => void
  // ) {
  //   const variablesArr = await getVariables(this);
  //   this.setState({
  //     variables: variablesArr
  //   });

  //   return onClick?.(e);
  // }

  render() {
    const {value, className, variableMode, header, size, ...rest} = this.props;
    const {formulaPickerValue, variables} = this.state;

    const highlightValue = FormulaEditor.highlightValue(
      formulaPickerValue,
      variables
    ) || {
      html: formulaPickerValue
    };

    // 自身字段
    const selfName = this.props?.data?.name;
    return (
      <div className={cx('ae-permissionControl', className)}>
        <Select
          creatable={true}
          editable={true}
          removable={true}
          className="w-full"
          options={this.state.options}
          value={formulaPickerValue}
          onChange={this.selectChange}
          onAdd={this.onAdd}
          onDelete={() => {}}
          onEdit={(item: any) =>
            this.setState({
              addForm: item,
              modalFlag: true
            })
          }
        ></Select>
        <Modal
          show={this.state.modalFlag}
          onHide={() => this.setState({modalFlag: false})}
        >
          <Modal.Header onClose={() => this.setState({modalFlag: false})}>
            <Modal.Title>创建权限</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormField
              isRequired={true}
              mode={'horizontal'}
              label={'标识'}
              labelAlign={'right'}
              description={'权限标识，例如「print」。不可修改'}
            >
              <InputBox
                placeholder="请输入"
                value={this.state.addForm.value}
                onChange={(val: string) => {
                  this.state.addForm.value = val;
                }}
              ></InputBox>
            </FormField>
            <FormField
              mode={'horizontal'}
              label={'标签'}
              labelAlign={'right'}
              description={'权限标签。例如：「可打印」'}
            >
              <InputBox
                placeholder="请输入"
                value={this.state.addForm.label}
                onChange={(val: string) => {
                  this.state.addForm.label = val;
                }}
              ></InputBox>
            </FormField>
          </Modal.Body>
          <Modal.Footer>
            <Button level={'primary'} onClick={this.confirm}>
              确定
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

@FormItem({
  type: 'ae-permissionControl'
})
export class PermissionControlRenderer extends PermissionControl {}
