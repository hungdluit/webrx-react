import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Icon } from 'react-fa';
import * as classNames from 'classnames';
import { FormGroup, InputGroup, FormControl, Sizes } from 'react-bootstrap';

import { BaseView, BaseViewProps } from '../../React/BaseView';
import { BindableInput } from '../BindableInput/BindableInput';
import { CommandButton } from '../CommandButton/CommandButton';
import { InlineEditViewModel } from './InlineEditViewModel';

import './InlineEdit.less';

interface InlineEditProps<T> extends BaseViewProps {
  template?: (x: T, view: InlineEditView) => any;
  editTemplate?: (x: T, view: InlineEditView) => any;
  bsSize?: Sizes;
  controlId?: string;
}

export class InlineEditView extends BaseView<InlineEditProps<any>, InlineEditViewModel<any>> {
  public static displayName = 'InlineEditView';

  static defaultProps = {
    template: (x: any, view: InlineEditView) => x.toString(),
    editTemplate: (x: any, view: InlineEditView) => (
      <FormControl ref='control' type='text' placeholder='Enter New Value...'
        onKeyDown={ e => view.handleKeyDown(e) }
      />
    ),
  };

  private handleKeyDown(e: React.KeyboardEvent) {
    switch (e.keyCode) {
      case 13: // ENTER key
        this.state.save.execute(null);
        break;
      case 27: // ESC key
        this.state.cancel.execute(null);
        break;
      default:
        break;
    }
  }

  private focusAndSelectControlText() {
    const control = ReactDOM.findDOMNode(this.refs['control']) as HTMLInputElement;

    if (control != null) {
      control.focus();

      if (control.select != null) {
        control.select();
      }
    }
  }

  updateOn() {
    return [
      this.state.isEditing.changed,
    ];
  }

  updated(prevProps: InlineEditProps<any>) {
    super.updated(prevProps);

    this.focusAndSelectControlText();
  }

  render() {
    return this.renderConditional(this.state.isEditing, () => this.renderEditor(), () => this.renderValue());
  }

  private renderEditor() {
    const { className, rest } = this.restProps(x => {
      const { template, editTemplate } = x;
      return { template, editTemplate };
    });

    return (
      <FormGroup { ...rest } className={ classNames('InlineEditView', className)}>
        <InputGroup>
          <BindableInput property={ this.state.editValue } >
            { this.props.editTemplate(this.state.editValue(), this) }
          </BindableInput>
          <InputGroup.Button>
            <CommandButton bsSize={ this.props.bsSize } bsStyle='success' command={ this.state.save }>
              <Icon name='check' />
            </CommandButton>
            <CommandButton bsSize={ this.props.bsSize } bsStyle='danger' command={ this.state.cancel }>
              <Icon name='times' />
            </CommandButton>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    );
  }

  private renderValue() {
    const { className, rest } = this.restProps(x => {
      const { template, editTemplate, controlId } = x;
      return { template, editTemplate, controlId };
    });

    return (
      <CommandButton { ...rest } className={ classNames('InlineEditView', className)} bsStyle='link' command={ this.state.edit }>
        <span>{ this.props.template(this.state.value(), this) }</span>
      </CommandButton>
    );
  }
}
