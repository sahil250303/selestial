import React from 'react';
import { MessageCircle, HelpCircle, Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ServiceSection = () => {
  const services = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "CUSTOMER SERVICE LIVE CHAT",
      description: "Need help? Speak to our Customer Service team via chat",
      cta: "START CHAT",
      link: "#" // Replace with actual chat link or handler
    },
    {
      icon: <HelpCircle className="w-8 h-8" />,
      title: "CUSTOMER SERVICE",
      description: "Explore answers to our FAQs or connect with our Customer Service team.",
      cta: "CONTACT US",
      link: "/contact" 
    },
    {
      icon: <Gift className="w-8 h-8" />,
      title: "GIFT SERVICES",
      description: "Add a personalized touch to your Selestial jewelry with our premium packaging.",
      cta: "EXPLORE GIFTS",
      link: "/gift-services"
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-12 border-t border-white/10 bg-black relative">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl md:text-2xl font-light tracking-[0.4em] text-center text-white mb-16 uppercase">
          SELESTIAL SERVICES
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 border border-white/10">
          {services.map((service, index) => (
            <div 
              key={index}
              className="p-8 md:p-12 flex flex-col items-center text-center border-b border-white/10 md:border-b-0 md:border-r border-white/10 last:border-r-0 last:border-b-0"
            >
              <div className="text-silver-light mb-6">
                {service.icon}
              </div>
              
              <h3 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-4">
                {service.title}
              </h3>
              
              <p className="text-silver-dark text-xs tracking-wider leading-relaxed mb-8 max-w-xs min-h-[40px]">
                {service.description}
              </p>
              
              <Link 
                to={service.link}
                className="mt-auto flex items-center gap-2 text-xs font-bold tracking-widest text-white border-b border-white/20 pb-1 hover:border-white transition-colors group/btn"
              >
                {service.cta}
                <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;
