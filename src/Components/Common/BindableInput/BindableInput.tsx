import * as React from 'react';
import * as wx from 'webrx';

export interface BindableProps {
  /**
   * Action to convert from the view element value to the property value (default is to coerce)
   */
  converter?: (x: any) => any;
  /**
   * Name of the view element value property (default is "value")
   */
  valueProperty?: string;
  /**
   * Name of the view element onChange event (defualt is "onChange")
   */
  onChangeProperty?: string;
  /**
   * Action to perform when fetching the current property value.
   * Default action is to assume an observable property and request the current value.
   */
  valueGetter?: (property: any) => any;
  /**
   * Action to perform when updating the current property value.
   * Default action is to assume an observable property and set the current value.
   */
  valueSetter?: (property: any, value: any) => void;
}

export interface BindableInputProps extends React.HTMLAttributes<BindableInput>, BindableProps {
  /**
   * input property (or value)
   */
  property: any;
}

export class BindableInput extends React.Component<BindableInputProps, any> {
  public static displayName = 'BindableInput';

  static defaultProps = {
    valueProperty: 'value',
    onChangeProperty: 'onChange',
    valueGetter: (property: wx.IObservableProperty<any>) => { return property(); },
    valueSetter: (property: wx.IObservableProperty<any>, value: any) => { property(value); },
  };

  render() {
    const { className, children, props, rest } = this.restProps(x => {
      const { property, converter, valueProperty, onChangeProperty, valueGetter, valueSetter } = x;
      return { property, converter, valueProperty, onChangeProperty, valueGetter, valueSetter };
    });

    const bindProps: any = {};
    bindProps[props.valueProperty] = props.valueGetter(props.property);
    bindProps[props.onChangeProperty] = (e: React.FormEvent<any>) => this.onChange(e);

    return React.cloneElement(
      React.Children.only(children),
      Object.assign({ className }, rest, bindProps)
    );
  }

  protected onChange(e: React.FormEvent<any>) {
    const target: any = e.target;
    let value: any = target[this.props.valueProperty];

    if (this.props.converter != null) {
      value = this.props.converter(value);
    }

    this.props.valueSetter(this.props.property, value);

    this.forceUpdate();
  }
}
